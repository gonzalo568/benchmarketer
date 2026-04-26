FROM node:20-alpine

WORKDIR /app

RUN apk add nginx

COPY apps/dashboard/dist ./apps/dashboard/dist

RUN mkdir -p /etc/nginx/http.d && \
    cat > /etc/nginx/http.d/default.conf << 'EOF'
server {
    listen 3000;
    root /app/apps/dashboard/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://host.docker.internal:3001;
        proxy_set_header Host $host;
    }
}
EOF

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]