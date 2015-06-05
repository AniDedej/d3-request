import dispatch from "d3-dispatch";

export function xhrType(defaultMimeType, response) {
  return function(url, mimeType, callback) {
    if (!callback && typeof mimeType === "function") callback = mimeType, mimeType = null;
    var r = xhr(url).mimeType(mimeType == null ? defaultMimeType : mimeType).response(response);
    return callback ? r.get(callback) : r;
  };
};

export default function(url, mimeType, callback) {
  var xhr,
      event = dispatch("beforesend", "progress", "load", "error"),
      headers = new Map,
      request = new XMLHttpRequest,
      response,
      responseType = null;

  if (!callback && typeof mimeType === "function") callback = mimeType, mimeType = null;

  // If IE does not support CORS, use XDomainRequest.
  if (typeof XDomainRequest !== "undefined"
      && !("withCredentials" in request)
      && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest;

  "onload" in request
      ? request.onload = request.onerror = respond
      : request.onreadystatechange = function() { request.readyState > 3 && respond(); };

  function respond() {
    var status = request.status, result;
    if (!status && hasResponse(request)
        || status >= 200 && status < 300
        || status === 304) {
      if (response) {
        try {
          result = response.call(xhr, request);
        } catch (e) {
          event.error.call(xhr, e);
          return;
        }
      } else {
        result = request;
      }
      event.load.call(xhr, result);
    } else {
      event.error.call(xhr, request);
    }
  }

  request.onprogress = function(e) {
    event.progress.call(xhr, e);
  };

  xhr = {
    header: function(name, value) {
      name = (name + "").toLowerCase();
      if (arguments.length < 2) return headers.get(name);
      if (value == null) headers.delete(name);
      else headers.set(name, value + "");
      return xhr;
    },

    // If mimeType is non-null and no Accept header is set, a default is used.
    mimeType: function(value) {
      if (!arguments.length) return mimeType;
      mimeType = value == null ? null : value + "";
      return xhr;
    },

    // Specifies what type the response value should take;
    // for instance, arraybuffer, blob, document, or text.
    responseType: function(value) {
      if (!arguments.length) return responseType;
      responseType = value;
      return xhr;
    },

    // Specify how to convert the response content to a specific type;
    // changes the callback value on "load" events.
    response: function(value) {
      response = value;
      return xhr;
    },

    // Alias for send("get", …).
    get: function(data, callback) {
      return xhr.send("get", data, callback);
    },

    // Alias for send("post", …).
    post: function(data, callback) {
      return xhr.send("post", data, callback);
    },

    // If callback is non-null, it will be used for error and load events.
    send: function(method, data, callback) {
      if (!callback && typeof data === "function") callback = data, data = null;
      if (callback && callback.length === 1) callback = fixCallback(callback);
      request.open(method, url, true);
      if (mimeType != null && !headers.has("accept")) headers.set("accept", mimeType + ",*/*");
      if (request.setRequestHeader) headers.forEach(function(value, name) { request.setRequestHeader(name, value); });
      if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
      if (responseType != null) request.responseType = responseType;
      if (callback) xhr.on("error", callback).on("load", function(request) { callback(null, request); });
      event.beforesend.call(xhr, request);
      request.send(data == null ? null : data);
      return xhr;
    },

    abort: function() {
      request.abort();
      return xhr;
    },

    on: function() {
      var value = event.on.apply(event, arguments);
      return value === event ? xhr : value;
    }
  };

  return callback
      ? xhr.get(callback)
      : xhr;
};

function fixCallback(callback) {
  return function(error, request) {
    callback(error == null ? request : null);
  };
}

function hasResponse(request) {
  var type = request.responseType;
  return type && type !== "text"
      ? request.response // null on error
      : request.responseText; // "" on error
}
