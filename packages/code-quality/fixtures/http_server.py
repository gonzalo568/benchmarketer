#!/usr/bin/env python3
"""Small HTTP utility module for testing positional recall."""

import os
import sys
import json
import hashlib
import urllib.parse
from typing import Dict, List, Optional, Tuple


def is_cgi(path: str, base_path: str) -> bool:
    """Check if the given path is a CGI script."""
    full_path = os.path.join(base_path, path)
    if not os.path.exists(full_path):
        return False
    if os.path.isdir(full_path):
        return False
    if path.endswith('.cgi') or path.endswith('.py'):
        return True
    with open(full_path, 'rb') as f:
        header = f.read(2)
        if header == b'#!':
            return True
    return False


def translate_path(path: str, base_path: str) -> str:
    """Translate a URL path to a filesystem path."""
    path = path.split('?', 1)[0]
    path = path.split('#', 1)[0]
    path = urllib.parse.unquote(path)
    drives = ''
    if len(path) >= 3 and path[0] == '/' and path[2] == ':':
        drive = path[1].upper()
        if drive.isalpha() and path[3] in ('/', '\\'):
            drives = f'{drive}:\\'
            path = path[3:]
    parts = path.split('/')
    parts = [p for p in parts if p and p != '.']
    new_parts = []
    for part in parts:
        if part == '..':
            if new_parts:
                new_parts.pop()
        else:
            new_parts.append(part)
    result = os.path.join(base_path, *new_parts)
    return drives + result


def compute_etag(content: bytes) -> str:
    """Compute ETag for content."""
    hash_value = hashlib.md5(content).hexdigest()
    return f'"{hash_value}"'


def format_date_time(timestamp: float) -> str:
    """Format timestamp as HTTP date."""
    from email.utils import formatdate
    return formatdate(timestamp, usegmt=True)


def parse_range_header(header: str, content_length: int) -> Optional[List[Tuple[int, int]]]:
    """Parse Range header value."""
    if not header.startswith('bytes='):
        return None
    ranges = []
    for range_spec in header[6:].split(','):
        range_spec = range_spec.strip()
        if '-' not in range_spec:
            continue
        start_str, end_str = range_spec.split('-', 1)
        if start_str == '':
            if end_str == '':
                continue
            suffix_length = int(end_str)
            start = max(0, content_length - suffix_length)
            end = content_length - 1
        elif end_str == '':
            start = int(start_str)
            end = content_length - 1
        else:
            start = int(start_str)
            end = int(end_str)
        if start <= end and start < content_length:
            end = min(end, content_length - 1)
            ranges.append((start, end))
    return ranges if ranges else None


def guess_content_type(path: str) -> str:
    """Guess content type from file extension."""
    import mimetypes
    content_type, _ = mimetypes.guess_type(path)
    return content_type or 'application/octet-stream'


def sanitize_html(text: str) -> str:
    """Sanitize HTML content to prevent XSS."""
    replacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
    }
    result = text
    for char, replacement in replacements.items():
        result = result.replace(char, replacement)
    return result


def generate_directory_listing(path: str, base_url: str) -> str:
    """Generate HTML directory listing."""
    entries = []
    try:
        items = sorted(os.listdir(path))
    except PermissionError:
        return '<h1>403 Forbidden</h1><p>Permission denied.</p>'

    for item in items:
        full_path = os.path.join(path, item)
        is_dir = os.path.isdir(full_path)
        display_name = item + '/' if is_dir else item
        url = urllib.parse.quote(item) + ('/' if is_dir else '')
        size = ''
        if not is_dir:
            try:
                size = os.path.getsize(full_path)
                size = f' ({size} bytes)'
            except OSError:
                size = ''
        entries.append(f'<li><a href="{url}">{sanitize_html(display_name)}</a>{size}</li>')

    listing = '\n'.join(entries)
    return f'''
<!DOCTYPE html>
<html>
<head><title>Directory listing for {sanitize_html(base_url)}</title></head>
<body>
<h1>Directory listing for {sanitize_html(base_url)}</h1>
<hr>
<ul>
{listing}
</ul>
<hr>
</body>
</html>
'''


def validate_request_headers(headers: Dict[str, str], required: List[str]) -> Tuple[bool, str]:
    """Validate that required headers are present."""
    missing = []
    for header in required:
        if header not in headers:
            missing.append(header)
    if missing:
        return False, f'Missing required headers: {", ".join(missing)}'
    return True, 'OK'


def parse_query_string(query_string: str) -> Dict[str, List[str]]:
    """Parse query string into dictionary."""
    params: Dict[str, List[str]] = {}
    if not query_string:
        return params
    for param in query_string.split('&'):
        if '=' in param:
            key, value = param.split('=', 1)
            key = urllib.parse.unquote_plus(key)
            value = urllib.parse.unquote_plus(value)
            if key not in params:
                params[key] = []
            params[key].append(value)
        else:
            key = urllib.parse.unquote_plus(param)
            if key not in params:
                params[key] = []
    return params


def create_response(status_code: int, status_message: str,
                    headers: Dict[str, str], body: bytes) -> bytes:
    """Create HTTP response bytes."""
    response_line = f'HTTP/1.1 {status_code} {status_message}\r\n'
    header_lines = '\r\n'.join(f'{k}: {v}' for k, v in headers.items())
    return f'{response_line}{header_lines}\r\n\r\n'.encode() + body


def calculate_content_hash(filepath: str, algorithm: str = 'sha256') -> str:
    """Calculate hash of file contents."""
    hasher = hashlib.new(algorithm)
    with open(filepath, 'rb') as f:
        while True:
            chunk = f.read(8192)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest()


def merge_headers(defaults: Dict[str, str], overrides: Dict[str, str]) -> Dict[str, str]:
    """Merge two header dictionaries, overrides take precedence."""
    result = dict(defaults)
    for key, value in overrides.items():
        result[key.lower()] = value
    return result


def parse_cookies(cookie_header: str) -> Dict[str, str]:
    """Parse Cookie header into dictionary."""
    cookies: Dict[str, str] = {}
    if not cookie_header:
        return cookies
    for cookie in cookie_header.split(';'):
        cookie = cookie.strip()
        if '=' in cookie:
            name, value = cookie.split('=', 1)
            cookies[name.strip()] = value.strip()
    return cookies


def build_set_cookie_header(name: str, value: str,
                           max_age: Optional[int] = None,
                           path: str = '/',
                           secure: bool = False,
                           httponly: bool = True) -> str:
    """Build Set-Cookie header value."""
    parts = [f'{name}={value}', f'Path={path}']
    if max_age is not None:
        parts.append(f'Max-Age={max_age}')
    if secure:
        parts.append('Secure')
    if httponly:
        parts.append('HttpOnly')
    return '; '.join(parts)


def validate_content_length(header_value: str, max_size: int) -> Tuple[bool, str]:
    """Validate Content-Length header against maximum allowed size."""
    try:
        length = int(header_value)
    except (ValueError, TypeError):
        return False, 'Invalid Content-Length value'
    if length < 0:
        return False, 'Negative Content-Length'
    if length > max_size:
        return False, f'Content-Length exceeds maximum ({max_size} bytes)'
    return True, 'OK'


def decode_urlencoded(data: bytes) -> Dict[str, str]:
    """Decode application/x-www-form-urlencoded data."""
    result: Dict[str, str] = {}
    text = data.decode('utf-8')
    for pair in text.split('&'):
        if '=' in pair:
            key, value = pair.split('=', 1)
            result[urllib.parse.unquote_plus(key)] = urllib.parse.unquote_plus(value)
        else:
            result[urllib.parse.unquote_plus(pair)] = ''
    return result


def generate_cache_control(max_age: int = 3600, public: bool = True,
                          no_cache: bool = False, no_store: bool = False) -> str:
    """Generate Cache-Control header value."""
    directives = []
    if no_store:
        directives.append('no-store')
    if no_cache:
        directives.append('no-cache')
    if public:
        directives.append('public')
    if max_age > 0 and not no_store:
        directives.append(f'max-age={max_age}')
    return ', '.join(directives)


def parse_if_modified_since(header_value: str, file_mtime: float) -> bool:
    """Check if resource was modified since given date."""
    from email.utils import parsedate_to_datetime
    try:
        since = parsedate_to_datetime(header_value).timestamp()
        return file_mtime > since
    except (ValueError, TypeError):
        return True


def create_error_response(status_code: int, message: str,
                         content_type: str = 'text/html') -> Tuple[bytes, Dict[str, str]]:
    """Create error response body and headers."""
    if content_type == 'text/html':
        body = f'''
<!DOCTYPE html>
<html>
<head><title>{status_code} {message}</title></head>
<body>
<h1>{status_code} {message}</h1>
<p>The requested resource could not be found.</p>
</body>
</html>
'''.encode()
    else:
        body = json.dumps({'error': message}).encode()

    headers = {
        'Content-Type': content_type,
        'Content-Length': str(len(body)),
    }
    return body, headers


def log_request(method: str, path: str, status_code: int,
               response_time_ms: float, client_ip: str) -> str:
    """Format request log entry."""
    timestamp = datetime.now().strftime('%d/%b/%Y %H:%M:%S')
    return f'{client_ip} - - [{timestamp}] "{method} {path}" {status_code} - {response_time_ms:.2f}ms'


def setup_server(port: int, handler_class, bind: str = '') -> socketserver.TCPServer:
    """Setup and return HTTP server."""
    import socketserver
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer((bind, port), handler_class)
    return server


def run_server(server: socketserver.TCPServer, port: int) -> None:
    """Run HTTP server until interrupted."""
    print(f'Serving HTTP on port {port}...')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nShutting down server...')
        server.shutdown()


if __name__ == '__main__':
    PORT = 8000
    import http.server
    import socketserver
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(('', PORT), Handler) as httpd:
        print(f'Serving at port {PORT}')
        httpd.serve_forever()
