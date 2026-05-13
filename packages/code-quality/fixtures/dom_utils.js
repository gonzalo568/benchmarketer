/**
 * Advanced data processing and utility library.
 * Provides comprehensive data manipulation, validation, and transformation functions.
 * Designed for use in server-side and client-side applications.
 */

(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DataProcessor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  var DataProcessor = {};

  function deepMergeObjects(target, source, options) {
    var opts = options || {};
    var arrayMerge = opts.arrayMerge || 'replace';
    var clone = opts.clone !== false;
    var result = clone ? JSON.parse(JSON.stringify(target)) : target;

    for (var key in source) {
      if (!source.hasOwnProperty(key)) continue;

      var sourceVal = source[key];
      var targetVal = result[key];

      if (sourceVal === null || sourceVal === undefined) {
        result[key] = sourceVal;
        continue;
      }

      if (Array.isArray(sourceVal)) {
        if (arrayMerge === 'concat' && Array.isArray(targetVal)) {
          result[key] = targetVal.concat(sourceVal);
        } else if (arrayMerge === 'unique' && Array.isArray(targetVal)) {
          var merged = targetVal.concat(sourceVal);
          result[key] = merged.filter(function(item, idx) {
            return merged.indexOf(item) === idx;
          });
        } else {
          result[key] = clone ? JSON.parse(JSON.stringify(sourceVal)) : sourceVal;
        }
      } else if (typeof sourceVal === 'object') {
        if (typeof targetVal === 'object' && !Array.isArray(targetVal)) {
          result[key] = deepMergeObjects(targetVal, sourceVal, options);
        } else {
          result[key] = clone ? JSON.parse(JSON.stringify(sourceVal)) : sourceVal;
        }
      } else {
        result[key] = sourceVal;
      }
    }

    return result;
  }

  function validateSchema(data, schema, strict) {
    var errors = [];
    var isStrict = strict !== false;

    function validate(value, rule, path) {
      if (rule.required && (value === null || value === undefined || value === '')) {
        errors.push({ path: path, message: 'Required field is missing' });
        return;
      }

      if (value === null || value === undefined) return;

      if (rule.type === 'string') {
        if (typeof value !== 'string') {
          errors.push({ path: path, message: 'Expected string, got ' + typeof value });
          return;
        }
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({ path: path, message: 'String too short (min ' + rule.minLength + ')' });
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({ path: path, message: 'String too long (max ' + rule.maxLength + ')' });
        }
        if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
          errors.push({ path: path, message: 'String does not match pattern' });
        }
      } else if (rule.type === 'number') {
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({ path: path, message: 'Expected number, got ' + typeof value });
          return;
        }
        if (rule.min !== undefined && value < rule.min) {
          errors.push({ path: path, message: 'Number too small (min ' + rule.min + ')' });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({ path: path, message: 'Number too large (max ' + rule.max + ')' });
        }
      } else if (rule.type === 'boolean') {
        if (typeof value !== 'boolean') {
          errors.push({ path: path, message: 'Expected boolean, got ' + typeof value });
        }
      } else if (rule.type === 'array') {
        if (!Array.isArray(value)) {
          errors.push({ path: path, message: 'Expected array, got ' + typeof value });
          return;
        }
        if (rule.minItems && value.length < rule.minItems) {
          errors.push({ path: path, message: 'Array too short (min ' + rule.minItems + ' items)' });
        }
        if (rule.maxItems && value.length > rule.maxItems) {
          errors.push({ path: path, message: 'Array too long (max ' + rule.maxItems + ' items)' });
        }
        if (rule.items) {
          value.forEach(function(item, idx) {
            validate(item, rule.items, path + '[' + idx + ']');
          });
        }
      } else if (rule.type === 'object') {
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push({ path: path, message: 'Expected object, got ' + (Array.isArray(value) ? 'array' : typeof value) });
          return;
        }
        if (rule.properties) {
          for (var propKey in rule.properties) {
            validate(value[propKey], rule.properties[propKey], path + '.' + propKey);
          }
          if (isStrict) {
            for (var dataKey in value) {
              if (!rule.properties[dataKey]) {
                errors.push({ path: path + '.' + dataKey, message: 'Unknown property' });
              }
            }
          }
        }
      } else if (rule.type === 'email') {
        var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value !== 'string' || !emailPattern.test(value)) {
          errors.push({ path: path, message: 'Invalid email address' });
        }
      } else if (rule.type === 'url') {
        var urlPattern = /^https?:\/\/[^\s]+$/;
        if (typeof value !== 'string' || !urlPattern.test(value)) {
          errors.push({ path: path, message: 'Invalid URL' });
        }
      } else if (rule.type === 'date') {
        var date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push({ path: path, message: 'Invalid date' });
        }
        if (rule.min && date < new Date(rule.min)) {
          errors.push({ path: path, message: 'Date too early' });
        }
        if (rule.max && date > new Date(rule.max)) {
          errors.push({ path: path, message: 'Date too late' });
        }
      } else if (rule.enum) {
        if (rule.enum.indexOf(value) === -1) {
          errors.push({ path: path, message: 'Value not in allowed values: ' + rule.enum.join(', ') });
        }
      }
    }

    for (var key in schema) {
      validate(data[key], schema[key], key);
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      errorCount: errors.length,
    };
  }

  function transformData(data, transformations, context) {
    var ctx = context || {};
    var result = Array.isArray(data) ? [] : {};
    var source = Array.isArray(data) ? data : [data];

    function applyTransform(item, transforms) {
      var output = {};
      for (var i = 0; i < transforms.length; i++) {
        var transform = transforms[i];

        if (transform.type === 'rename') {
          output[transform.to] = item[transform.from];
        } else if (transform.type === 'compute') {
          output[transform.field] = transform.fn(item, ctx);
        } else if (transform.type === 'filter') {
          if (!transform.fn(item, ctx)) {
            return null;
          }
        } else if (transform.type === 'default') {
          if (item[transform.field] === undefined || item[transform.field] === null) {
            output[transform.field] = typeof transform.value === 'function'
              ? transform.value(item, ctx)
              : transform.value;
          } else {
            output[transform.field] = item[transform.field];
          }
        } else if (transform.type === 'map') {
          if (Array.isArray(item[transform.field])) {
            output[transform.field] = item[transform.field].map(function(val) {
              return transform.fn(val, ctx);
            });
          }
        } else if (transform.type === 'flatten') {
          var nested = item[transform.field];
          if (nested && typeof nested === 'object') {
            for (var key in nested) {
              output[transform.prefix ? transform.prefix + key : key] = nested[key];
            }
          }
        } else if (transform.type === 'pick') {
          for (var j = 0; j < transform.fields.length; j++) {
            var field = transform.fields[j];
            if (item[field] !== undefined) {
              output[field] = item[field];
            }
          }
        } else if (transform.type === 'omit') {
          for (var k in item) {
            if (transform.fields.indexOf(k) === -1) {
              output[k] = item[k];
            }
          }
        } else if (transform.type === 'copy') {
          for (var m in item) {
            output[m] = item[m];
          }
        }
      }
      return output;
    }

    for (var i = 0; i < source.length; i++) {
      var transformed = applyTransform(source[i], transformations);
      if (transformed !== null) {
        if (Array.isArray(data)) {
          result.push(transformed);
        } else {
          result = transformed;
        }
      }
    }

    return result;
  }

  function paginateResults(data, page, pageSize, options) {
    var opts = options || {};
    var currentPage = Math.max(1, parseInt(page) || 1);
    var size = Math.max(1, Math.min(100, parseInt(pageSize) || 10));
    var totalItems = Array.isArray(data) ? data.length : 0;
    var totalPages = Math.ceil(totalItems / size);
    var startIndex = (currentPage - 1) * size;
    var endIndex = Math.min(startIndex + size, totalItems);
    var items = Array.isArray(data) ? data.slice(startIndex, endIndex) : [];

    var result = {
      data: items,
      pagination: {
        currentPage: currentPage,
        pageSize: size,
        totalItems: totalItems,
        totalPages: totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1,
      },
    };

    if (opts.includeLinks) {
      result.pagination.links = {};
      if (result.pagination.hasPrevPage) {
        result.pagination.links.prev = '/?page=' + (currentPage - 1) + '&size=' + size;
      }
      if (result.pagination.hasNextPage) {
        result.pagination.links.next = '/?page=' + (currentPage + 1) + '&size=' + size;
      }
      result.pagination.links.first = '/?page=1&size=' + size;
      result.pagination.links.last = '/?page=' + totalPages + '&size=' + size;
    }

    if (opts.includeMeta) {
      result.meta = {
        requestTime: new Date().toISOString(),
        apiVersion: opts.apiVersion || '1.0',
        requestId: opts.requestId || generateRequestId(),
      };
    }

    return result;
  }

  function generateRequestId() {
    return 'req_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
  }

  function sortCollection(collection, sortRules, caseSensitive) {
    var items = Array.isArray(collection) ? collection.slice() : [];
    var sensitive = caseSensitive !== false;

    function compareValues(a, b) {
      if (a === null && b === null) return 0;
      if (a === null) return -1;
      if (b === null) return 1;

      if (typeof a === 'string' && typeof b === 'string') {
        var strA = sensitive ? a : a.toLowerCase();
        var strB = sensitive ? b : b.toLowerCase();
        return strA.localeCompare(strB);
      }

      if (typeof a === 'number' && typeof b === 'number') {
        return a - b;
      }

      if (a instanceof Date && b instanceof Date) {
        return a.getTime() - b.getTime();
      }

      return String(a).localeCompare(String(b));
    }

    items.sort(function(a, b) {
      for (var i = 0; i < sortRules.length; i++) {
        var rule = sortRules[i];
        var field = rule.field;
        var direction = rule.direction === 'desc' ? -1 : 1;
        var valA = getNestedValue(a, field);
        var valB = getNestedValue(b, field);
        var cmp = compareValues(valA, valB);
        if (cmp !== 0) return cmp * direction;
      }
      return 0;
    });

    return items;
  }

  function getNestedValue(obj, path) {
    var keys = path.split('.');
    var current = obj;
    for (var i = 0; i < keys.length; i++) {
      if (current === null || current === undefined) return undefined;
      current = current[keys[i]];
    }
    return current;
  }

  function filterCollection(collection, filterRules, matchMode) {
    var items = Array.isArray(collection) ? collection : [];
    var mode = matchMode || 'and';

    function matchesFilter(item, rule) {
      var value = getNestedValue(item, rule.field);

      switch (rule.operator) {
        case 'eq':
          return value === rule.value;
        case 'neq':
          return value !== rule.value;
        case 'gt':
          return value > rule.value;
        case 'gte':
          return value >= rule.value;
        case 'lt':
          return value < rule.value;
        case 'lte':
          return value <= rule.value;
        case 'in':
          return Array.isArray(rule.value) && rule.value.indexOf(value) !== -1;
        case 'nin':
          return Array.isArray(rule.value) && rule.value.indexOf(value) === -1;
        case 'contains':
          return typeof value === 'string' && value.indexOf(rule.value) !== -1;
        case 'startswith':
          return typeof value === 'string' && value.indexOf(rule.value) === 0;
        case 'endswith':
          return typeof value === 'string' && value.slice(-rule.value.length) === rule.value;
        case 'regex':
          return typeof value === 'string' && new RegExp(rule.value).test(value);
        case 'between':
          return Array.isArray(rule.value) && value >= rule.value[0] && value <= rule.value[1];
        case 'null':
          return value === null || value === undefined;
        case 'notnull':
          return value !== null && value !== undefined;
        default:
          return true;
      }
    }

    return items.filter(function(item) {
      if (mode === 'and') {
        return filterRules.every(function(rule) { return matchesFilter(item, rule); });
      } else if (mode === 'or') {
        return filterRules.some(function(rule) { return matchesFilter(item, rule); });
      }
      return true;
    });
  }

  function aggregateCollection(collection, groupBy, aggregations) {
    var items = Array.isArray(collection) ? collection : [];
    var groups = {};

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var key = getNestedValue(item, groupBy);
      var groupKey = String(key);

      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupKey: key,
          count: 0,
          items: [],
        };
      }

      groups[groupKey].count++;
      groups[groupKey].items.push(item);
    }

    var results = [];
    for (var groupKey in groups) {
      var group = groups[groupKey];
      var result = { groupKey: group.groupKey, count: group.count };

      for (var j = 0; j < aggregations.length; j++) {
        var agg = aggregations[j];
        var values = group.items.map(function(item) {
          return getNestedValue(item, agg.field);
        }).filter(function(v) { return v !== null && v !== undefined; });

        switch (agg.type) {
          case 'sum':
            result[agg.alias || agg.field + '_sum'] = values.reduce(function(a, b) { return a + b; }, 0);
            break;
          case 'avg':
            result[agg.alias || agg.field + '_avg'] = values.length > 0
              ? values.reduce(function(a, b) { return a + b; }, 0) / values.length
              : 0;
            break;
          case 'min':
            result[agg.alias || agg.field + '_min'] = values.length > 0 ? Math.min.apply(null, values) : null;
            break;
          case 'max':
            result[agg.alias || agg.field + '_max'] = values.length > 0 ? Math.max.apply(null, values) : null;
            break;
          case 'count':
            result[agg.alias || agg.field + '_count'] = values.length;
            break;
          case 'distinct':
            result[agg.alias || agg.field + '_distinct'] = values.filter(function(v, idx) {
              return values.indexOf(v) === idx;
            }).length;
            break;
        }
      }

      results.push(result);
    }

    return results;
  }

  function exportToCSV(data, columns, options) {
    var opts = options || {};
    var delimiter = opts.delimiter || ',';
    var quote = opts.quote !== undefined ? opts.quote : '"';
    var includeHeader = opts.includeHeader !== false;
    var items = Array.isArray(data) ? data : [data];

    function escapeValue(value) {
      if (value === null || value === undefined) return '';
      var str = String(value);
      if (str.indexOf(delimiter) !== -1 || str.indexOf(quote) !== -1 || str.indexOf('\n') !== -1) {
        return quote + str.replace(new RegExp(quote, 'g'), quote + quote) + quote;
      }
      return str;
    }

    var lines = [];

    if (includeHeader) {
      var header = columns.map(function(col) {
        return escapeValue(col.label || col.field);
      }).join(delimiter);
      lines.push(header);
    }

    for (var i = 0; i < items.length; i++) {
      var row = columns.map(function(col) {
        var value = getNestedValue(items[i], col.field);
        if (col.format && typeof col.format === 'function') {
          value = col.format(value, items[i]);
        }
        return escapeValue(value);
      }).join(delimiter);
      lines.push(row);
    }

    var csvContent = lines.join('\n');

    if (opts.bom) {
      csvContent = '\uFEFF' + csvContent;
    }

    return csvContent;
  }

  function importFromCSV(csvContent, columns, options) {
    var opts = options || {};
    var delimiter = opts.delimiter || ',';
    var quote = opts.quote !== undefined ? opts.quote : '"';
    var lines = csvContent.split('\n').filter(function(line) { return line.trim() !== ''; });

    if (lines.length === 0) return [];

    var startIndex = opts.hasHeader ? 1 : 0;
    var results = [];

    function parseLine(line) {
      var values = [];
      var current = '';
      var inQuotes = false;

      for (var i = 0; i < line.length; i++) {
        var char = line[i];
        if (inQuotes) {
          if (char === quote) {
            if (line[i + 1] === quote) {
              current += quote;
              i++;
            } else {
              inQuotes = false;
            }
          } else {
            current += char;
          }
        } else {
          if (char === quote) {
            inQuotes = true;
          } else if (char === delimiter) {
            values.push(current);
            current = '';
          } else {
            current += char;
          }
        }
      }
      values.push(current);
      return values;
    }

    for (var i = startIndex; i < lines.length; i++) {
      var values = parseLine(lines[i]);
      var row = {};

      for (var j = 0; j < columns.length; j++) {
        var col = columns[j];
        var value = values[j] || '';

        if (col.parse && typeof col.parse === 'function') {
          value = col.parse(value);
        } else if (col.type === 'number') {
          value = parseFloat(value) || 0;
        } else if (col.type === 'boolean') {
          value = value.toLowerCase() === 'true' || value === '1';
        }

        row[col.field] = value;
      }

      results.push(row);
    }

    return results;
  }

  function debounceAsync(func, wait, options) {
    var opts = options || {};
    var timeout = null;
    var leading = opts.leading === true;
    var trailing = opts.trailing !== false;
    var maxWait = opts.maxWait;
    var lastCallTime = 0;
    var lastInvokeTime = 0;
    var result = undefined;
    var lastArgs = undefined;
    var lastThis = undefined;

    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime;
      var timeSinceLastInvoke = time - lastInvokeTime;

      return (
        lastCallTime === 0 ||
        timeSinceLastCall >= wait ||
        timeSinceLastCall < 0 ||
        (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
      );
    }

    function invokeFunc(time) {
      var args = lastArgs;
      var thisArg = lastThis;
      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time) {
      lastInvokeTime = time;
      timeout = setTimeout(timerExpired, wait);
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime;
      var timeSinceLastInvoke = time - lastInvokeTime;
      var timeWaiting = wait - timeSinceLastCall;

      return maxWait !== undefined
        ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
        : timeWaiting;
    }

    function timerExpired() {
      var time = Date.now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      timeout = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
      timeout = undefined;
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timeout = undefined;
    }

    function flush() {
      return timeout !== undefined ? trailingEdge(Date.now()) : result;
    }

    function debounced() {
      var time = Date.now();
      var isInvoking = shouldInvoke(time);

      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timeout === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxWait !== undefined) {
          timeout = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }

      if (timeout === undefined) {
        timeout = setTimeout(timerExpired, wait);
      }

      return result;
    }

    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  function throttleAsync(func, limit, options) {
    var opts = options || {};
    var inThrottle = false;
    var lastResult = undefined;
    var lastArgs = undefined;
    var lastThis = undefined;
    var trailing = opts.trailing !== false;
    var queue = [];

    function execute() {
      inThrottle = true;
      var args = lastArgs;
      var thisArg = lastThis;
      lastArgs = lastThis = undefined;

      try {
        lastResult = func.apply(thisArg, args);
      } catch (err) {
        lastResult = Promise.reject(err);
      }

      setTimeout(function() {
        inThrottle = false;
        if (trailing && queue.length > 0) {
          var next = queue.shift();
          lastArgs = next.args;
          lastThis = next.thisArg;
          execute();
        }
      }, limit);
    }

    function throttled() {
      if (!inThrottle) {
        execute();
      } else if (trailing) {
        queue.push({ args: arguments, thisArg: this });
      }
      return lastResult;
    }

    throttled.cancel = function() {
      queue = [];
      inThrottle = false;
    };

    return throttled;
  }

  function createEventEmitter() {
    var listeners = {};
    var onceListeners = {};

    function on(event, callback) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
      return function off() {
        listeners[event] = listeners[event].filter(function(cb) { return cb !== callback; });
      };
    }

    function once(event, callback) {
      if (!onceListeners[event]) onceListeners[event] = [];
      onceListeners[event].push(callback);
      return function off() {
        onceListeners[event] = onceListeners[event].filter(function(cb) { return cb !== callback; });
      };
    }

    function emit(event) {
      var args = Array.prototype.slice.call(arguments, 1);
      var emitted = false;

      if (listeners[event]) {
        listeners[event].forEach(function(callback) {
          try {
            callback.apply(null, args);
            emitted = true;
          } catch (err) {
            console.error('Error in event listener:', err);
          }
        });
      }

      if (onceListeners[event]) {
        var toCall = onceListeners[event].slice();
        onceListeners[event] = [];
        toCall.forEach(function(callback) {
          try {
            callback.apply(null, args);
            emitted = true;
          } catch (err) {
            console.error('Error in once listener:', err);
          }
        });
      }

      return emitted;
    }

    function off(event, callback) {
      if (listeners[event]) {
        listeners[event] = listeners[event].filter(function(cb) { return cb !== callback; });
      }
      if (onceListeners[event]) {
        onceListeners[event] = onceListeners[event].filter(function(cb) { return cb !== callback; });
      }
    }

    function removeAllListeners(event) {
      if (event) {
        delete listeners[event];
        delete onceListeners[event];
      } else {
        listeners = {};
        onceListeners = {};
      }
    }

    function listenerCount(event) {
      var count = 0;
      if (listeners[event]) count += listeners[event].length;
      if (onceListeners[event]) count += onceListeners[event].length;
      return count;
    }

    return {
      on: on,
      once: once,
      emit: emit,
      off: off,
      removeAllListeners: removeAllListeners,
      listenerCount: listenerCount,
    };
  }

  function createCache(maxSize, ttl, evictionPolicy) {
    var maxSize = maxSize || 100;
    var ttl = ttl || 3600000;
    var policy = evictionPolicy || 'lru';
    var store = {};
    var accessOrder = [];
    var size = 0;

    function isExpired(entry) {
      return Date.now() - entry.timestamp > ttl;
    }

    function evict() {
      if (policy === 'lru' && accessOrder.length > 0) {
        var oldest = accessOrder.shift();
        delete store[oldest];
        size--;
      } else if (policy === 'fifo') {
        var keys = Object.keys(store);
        if (keys.length > 0) {
          delete store[keys[0]];
          size--;
        }
      }
    }

    function get(key) {
      var entry = store[key];
      if (!entry) return undefined;
      if (isExpired(entry)) {
        delete store[key];
        size--;
        return undefined;
      }
      if (policy === 'lru') {
        accessOrder = accessOrder.filter(function(k) { return k !== key; });
        accessOrder.push(key);
      }
      return entry.value;
    }

    function set(key, value) {
      if (store[key]) {
        store[key] = { value: value, timestamp: Date.now() };
        if (policy === 'lru') {
          accessOrder = accessOrder.filter(function(k) { return k !== key; });
          accessOrder.push(key);
        }
        return;
      }

      while (size >= maxSize) {
        evict();
      }

      store[key] = { value: value, timestamp: Date.now() };
      size++;
      if (policy === 'lru') {
        accessOrder.push(key);
      }
    }

    function has(key) {
      return get(key) !== undefined;
    }

    function del(key) {
      if (store[key]) {
        delete store[key];
        size--;
        if (policy === 'lru') {
          accessOrder = accessOrder.filter(function(k) { return k !== key; });
        }
        return true;
      }
      return false;
    }

    function clear() {
      store = {};
      accessOrder = [];
      size = 0;
    }

    function keys() {
      return Object.keys(store).filter(function(key) {
        return !isExpired(store[key]);
      });
    }

    function values() {
      return keys().map(function(key) { return store[key].value; });
    }

    function size() {
      return size;
    }

    function cleanup() {
      var expiredKeys = keys().filter(function(key) {
        return isExpired(store[key]);
      });
      expiredKeys.forEach(function(key) {
        delete store[key];
        size--;
      });
      return expiredKeys.length;
    }

    return {
      get: get,
      set: set,
      has: has,
      delete: del,
      clear: clear,
      keys: keys,
      values: values,
      size: size,
      cleanup: cleanup,
    };
  }

  return DataProcessor;
});
