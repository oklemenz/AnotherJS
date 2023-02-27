(function () {
  // Set up the canvas
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#ff0000";
  ctx.lineWith = 2;

  // Set up mouse events for drawing
  var drawing = false;
  var mousePos = { x: 0, y: 0 };
  var touchCount = 0;
  canvas.addEventListener("mousedown", function (e) {
    window.onPress && window.onPress(getMousePos(canvas, e), touchCount);
  }, false);
  canvas.addEventListener("mouseup", function (e) {
    window.onRelease && window.onRelease(getMousePos(canvas, e), touchCount);
  }, false);
  canvas.addEventListener("mousemove", function (e) {
    window.onMove && window.onMove(getMousePos(canvas, e), touchCount);
  }, false);

  // Set up touch events for mobile, etc
  canvas.addEventListener("touchstart", function (e) {
    mousePos = getTouchPos(canvas, e);
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousedown", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, false);

  canvas.addEventListener("touchend", function (e) {
    mousePos = getTouchPos(canvas, e);
    var mouseEvent = new MouseEvent("mouseup", {});
    canvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, false);

  canvas.addEventListener("touchmove", function (e) {
    mousePos = getTouchPos(canvas, e);
    var touch = e.touches[0];
    var mouseEvent = new MouseEvent("mousemove", {
      clientX: touch.clientX,
      clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
    e.preventDefault();
  }, false);

  // Prevent scrolling when touching the canvas
  document.body.addEventListener("touchstart", function (e) {
    if (e.target === canvas) {
      e.preventDefault();
    }
  }, false);

  document.body.addEventListener("touchend", function (e) {
    if (e.target === canvas) {
      e.preventDefault();
    }
  }, false);

  document.body.addEventListener("touchmove", function (e) {
    if (e.target === canvas) {
      e.preventDefault();
    }
  }, false);

  // Get the position of a touch relative to the canvas
  function getEventPos(canvasDom, event) {
    var rect = { left: 0, top: 0, width: 0, height: 0 };
    var ratio = canvasDom.width / canvasDom.height;
    var size = { width: window.innerWidth, height: window.innerHeight };
    if (size.width >= size.height * ratio) {
      rect.left = (size.width - size.height * ratio) / 2;
      rect.width = size.height * ratio;
      rect.height = size.height;
    } else {
      rect.top = (size.height - size.width / ratio) / 2;
      rect.width = size.width;
      rect.height = size.width / ratio;
    }
    return {
      x: (event.clientX - rect.left) / rect.width * canvasDom.width,
      y: (event.clientY - rect.top) / rect.height * canvasDom.height
    };
  }

  function getMousePos(canvasDom, mouseEvent) {
    return getEventPos(canvasDom, mouseEvent);
  }

  function getTouchPos(canvasDom, touchEvent) {
    touchCount = touchEvent.touches.length;
    if (touchCount > 0) {
      return getEventPos(canvasDom, touchEvent.touches[0]);
    }
  }
})();