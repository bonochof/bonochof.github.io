(function () {
  var canvas = document.getElementById('life-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var cellSize = 10;
  var cols, rows;
  var grid, next;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    cols = Math.ceil(canvas.width / cellSize);
    rows = Math.ceil(canvas.height / cellSize);
    init();
  }

  function init() {
    grid = [];
    for (var i = 0; i < cols; i++) {
      grid[i] = [];
      for (var j = 0; j < rows; j++) {
        grid[i][j] = Math.random() < 0.08 ? 1 : 0;
      }
    }
  }

  function countNeighbors(g, x, y) {
    var sum = 0;
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        var ci = (x + i + cols) % cols;
        var cj = (y + j + rows) % rows;
        sum += g[ci][cj];
      }
    }
    return sum;
  }

  function step() {
    next = [];
    for (var i = 0; i < cols; i++) {
      next[i] = [];
      for (var j = 0; j < rows; j++) {
        var n = countNeighbors(grid, i, j);
        if (grid[i][j] === 1) {
          next[i][j] = (n === 2 || n === 3) ? 1 : 0;
        } else {
          next[i][j] = (n === 3) ? 1 : 0;
        }
      }
    }
    grid = next;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        if (grid[i][j] === 1) {
          ctx.fillStyle = 'rgba(100, 160, 200, 0.12)';
          ctx.fillRect(i * cellSize, j * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  }

  var frameCount = 0;
  function loop() {
    frameCount++;
    if (frameCount % 8 === 0) {
      step();
    }
    draw();
    requestAnimationFrame(loop);
  }

  // document で受けることで z-index:-1 のcanvas裏でもクリックが効く
  document.addEventListener('click', function (e) {
    var x = Math.floor(e.clientX / cellSize);
    var y = Math.floor(e.clientY / cellSize);
    for (var i = -3; i <= 3; i++) {
      for (var j = -3; j <= 3; j++) {
        var ci = (x + i + cols) % cols;
        var cj = (y + j + rows) % rows;
        if (Math.random() < 0.5) grid[ci][cj] = 1;
      }
    }
  });

  // マウス移動でもセルを少し生成
  var lastMove = 0;
  document.addEventListener('mousemove', function (e) {
    var now = Date.now();
    if (now - lastMove < 100) return;
    lastMove = now;
    var x = Math.floor(e.clientX / cellSize);
    var y = Math.floor(e.clientY / cellSize);
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        var ci = (x + i + cols) % cols;
        var cj = (y + j + rows) % rows;
        if (Math.random() < 0.3) grid[ci][cj] = 1;
      }
    }
  });

  window.addEventListener('resize', resize);
  resize();
  loop();
})();
