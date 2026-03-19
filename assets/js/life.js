(function () {
  var canvas = document.getElementById('life-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var models = [gameOfLife, boids, grayScott, physarum];
  var model = models[Math.floor(Math.random() * models.length)];
  model();

  // =============================================
  // Model 1: Conway's Game of Life
  // =============================================
  function gameOfLife() {
    var cellSize = 10;
    var cols, rows, grid;

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
          sum += g[(x + i + cols) % cols][(y + j + rows) % rows];
        }
      }
      return sum;
    }

    function step() {
      var next = [];
      for (var i = 0; i < cols; i++) {
        next[i] = [];
        for (var j = 0; j < rows; j++) {
          var n = countNeighbors(grid, i, j);
          next[i][j] = grid[i][j] === 1 ? (n === 2 || n === 3 ? 1 : 0) : (n === 3 ? 1 : 0);
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
      if (frameCount % 8 === 0) step();
      draw();
      requestAnimationFrame(loop);
    }

    document.addEventListener('click', function (e) {
      var x = Math.floor(e.clientX / cellSize);
      var y = Math.floor(e.clientY / cellSize);
      for (var i = -3; i <= 3; i++) {
        for (var j = -3; j <= 3; j++) {
          if (Math.random() < 0.5) grid[(x + i + cols) % cols][(y + j + rows) % rows] = 1;
        }
      }
    });

    var lastMove = 0;
    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastMove < 100) return;
      lastMove = now;
      var x = Math.floor(e.clientX / cellSize);
      var y = Math.floor(e.clientY / cellSize);
      for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
          if (Math.random() < 0.3) grid[(x + i + cols) % cols][(y + j + rows) % rows] = 1;
        }
      }
    });

    window.addEventListener('resize', resize);
    resize();
    loop();
  }

  // =============================================
  // Model 2: Boids (flocking simulation)
  // =============================================
  function boids() {
    var NUM = 80;
    var flock = [];
    var maxSpeed = 1.5;
    var maxForce = 0.04;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function initBoid() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
      };
    }

    function init() {
      flock = [];
      for (var i = 0; i < NUM; i++) flock.push(initBoid());
    }

    function limit(vx, vy, max) {
      var mag = Math.sqrt(vx * vx + vy * vy);
      if (mag > max) { vx = vx / mag * max; vy = vy / mag * max; }
      return [vx, vy];
    }

    function step() {
      for (var i = 0; i < flock.length; i++) {
        var b = flock[i];
        var sx = 0, sy = 0, sc = 0; // separation
        var ax = 0, ay = 0, ac = 0; // alignment
        var cx = 0, cy = 0, cc = 0; // cohesion

        for (var j = 0; j < flock.length; j++) {
          if (i === j) continue;
          var o = flock[j];
          var dx = o.x - b.x, dy = o.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy);

          if (d < 25 && d > 0) { sx -= dx / d; sy -= dy / d; sc++; }
          if (d < 60) { ax += o.vx; ay += o.vy; ac++; }
          if (d < 80) { cx += o.x; cy += o.y; cc++; }
        }

        var fx = 0, fy = 0;
        if (sc > 0) { var s = limit(sx / sc, sy / sc, maxForce); fx += s[0] * 1.5; fy += s[1] * 1.5; }
        if (ac > 0) { var a = limit(ax / ac - b.vx, ay / ac - b.vy, maxForce); fx += a[0]; fy += a[1]; }
        if (cc > 0) { var t = limit(cx / cc - b.x, cy / cc - b.y, maxForce); fx += t[0]; fy += t[1]; }

        b.vx += fx; b.vy += fy;
        var v = limit(b.vx, b.vy, maxSpeed);
        b.vx = v[0]; b.vy = v[1];
        b.x += b.vx; b.y += b.vy;

        // Wrap around
        if (b.x < 0) b.x += canvas.width;
        if (b.x > canvas.width) b.x -= canvas.width;
        if (b.y < 0) b.y += canvas.height;
        if (b.y > canvas.height) b.y -= canvas.height;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(100, 160, 200, 0.18)';
      for (var i = 0; i < flock.length; i++) {
        var b = flock[i];
        var angle = Math.atan2(b.vy, b.vx);
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(6, 0);
        ctx.lineTo(-3, 3);
        ctx.lineTo(-3, -3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    function loop() {
      step();
      draw();
      requestAnimationFrame(loop);
    }

    document.addEventListener('click', function (e) {
      for (var i = 0; i < 5; i++) {
        var b = initBoid();
        b.x = e.clientX + (Math.random() - 0.5) * 40;
        b.y = e.clientY + (Math.random() - 0.5) * 40;
        flock.push(b);
      }
    });

    var lastMove = 0;
    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastMove < 200) return;
      lastMove = now;
      // Gently push nearby boids away from cursor
      for (var i = 0; i < flock.length; i++) {
        var b = flock[i];
        var dx = b.x - e.clientX, dy = b.y - e.clientY;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < 80 && d > 0) {
          b.vx += dx / d * 0.3;
          b.vy += dy / d * 0.3;
        }
      }
    });

    window.addEventListener('resize', resize);
    resize();
    init();
    loop();
  }

  // =============================================
  // Model 3: Gray-Scott reaction-diffusion
  // =============================================
  function grayScott() {
    var scale = 4;
    var cols, rows;
    var u, v, nextU, nextV;
    var F = 0.037, K = 0.06;
    var Du = 0.21, Dv = 0.105;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / scale);
      rows = Math.ceil(canvas.height / scale);
      init();
    }

    function init() {
      u = []; v = [];
      for (var i = 0; i < cols; i++) {
        u[i] = []; v[i] = [];
        for (var j = 0; j < rows; j++) {
          u[i][j] = 1;
          v[i][j] = 0;
        }
      }
      // Seed a few spots
      for (var s = 0; s < 12; s++) {
        var cx = Math.floor(Math.random() * cols);
        var cy = Math.floor(Math.random() * rows);
        for (var di = -3; di <= 3; di++) {
          for (var dj = -3; dj <= 3; dj++) {
            var ni = (cx + di + cols) % cols;
            var nj = (cy + dj + rows) % rows;
            u[ni][nj] = 0.5;
            v[ni][nj] = 0.25;
          }
        }
      }
    }

    function step() {
      nextU = []; nextV = [];
      for (var i = 0; i < cols; i++) {
        nextU[i] = []; nextV[i] = [];
        for (var j = 0; j < rows; j++) {
          var ip = (i + 1) % cols, im = (i - 1 + cols) % cols;
          var jp = (j + 1) % rows, jm = (j - 1 + rows) % rows;
          var lapU = u[ip][j] + u[im][j] + u[i][jp] + u[i][jm] - 4 * u[i][j];
          var lapV = v[ip][j] + v[im][j] + v[i][jp] + v[i][jm] - 4 * v[i][j];
          var uvv = u[i][j] * v[i][j] * v[i][j];
          nextU[i][j] = u[i][j] + Du * lapU - uvv + F * (1 - u[i][j]);
          nextV[i][j] = v[i][j] + Dv * lapV + uvv - (F + K) * v[i][j];
        }
      }
      u = nextU; v = nextV;
    }

    function draw() {
      var imgData = ctx.createImageData(canvas.width, canvas.height);
      var data = imgData.data;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var val = v[i][j];
          var alpha = Math.floor(val * 40);
          if (alpha > 30) alpha = 30;
          for (var si = 0; si < scale; si++) {
            for (var sj = 0; sj < scale; sj++) {
              var px = i * scale + si;
              var py = j * scale + sj;
              if (px < canvas.width && py < canvas.height) {
                var idx = (py * canvas.width + px) * 4;
                data[idx] = 100;
                data[idx + 1] = 160;
                data[idx + 2] = 200;
                data[idx + 3] = alpha;
              }
            }
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    var frameCount = 0;
    function loop() {
      frameCount++;
      // Run multiple simulation steps per frame for speed
      for (var s = 0; s < 4; s++) step();
      if (frameCount % 2 === 0) draw();
      requestAnimationFrame(loop);
    }

    document.addEventListener('click', function (e) {
      var cx = Math.floor(e.clientX / scale);
      var cy = Math.floor(e.clientY / scale);
      for (var di = -4; di <= 4; di++) {
        for (var dj = -4; dj <= 4; dj++) {
          var ni = (cx + di + cols) % cols;
          var nj = (cy + dj + rows) % rows;
          u[ni][nj] = 0.5;
          v[ni][nj] = 0.25;
        }
      }
    });

    var lastMove = 0;
    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastMove < 150) return;
      lastMove = now;
      var cx = Math.floor(e.clientX / scale);
      var cy = Math.floor(e.clientY / scale);
      for (var di = -1; di <= 1; di++) {
        for (var dj = -1; dj <= 1; dj++) {
          var ni = (cx + di + cols) % cols;
          var nj = (cy + dj + rows) % rows;
          if (Math.random() < 0.5) {
            u[ni][nj] = 0.5;
            v[ni][nj] = 0.25;
          }
        }
      }
    });

    window.addEventListener('resize', resize);
    resize();
    loop();
  }

  // =============================================
  // Model 4: Physarum (slime mold) simulation
  // =============================================
  function physarum() {
    var scale = 2;
    var cols, rows;
    var trail;       // pheromone trail map
    var agents = [];
    var NUM_AGENTS = 8000;
    var sensorAngle = Math.PI / 4;   // 45 degrees
    var sensorDist = 9;
    var turnSpeed = Math.PI / 4;
    var moveSpeed = 1;
    var decayRate = 0.93;
    var depositAmount = 5;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      cols = Math.ceil(canvas.width / scale);
      rows = Math.ceil(canvas.height / scale);
      init();
    }

    function init() {
      trail = [];
      for (var i = 0; i < cols; i++) {
        trail[i] = [];
        for (var j = 0; j < rows; j++) {
          trail[i][j] = 0;
        }
      }
      agents = [];
      // Spawn agents in a few clusters
      for (var a = 0; a < NUM_AGENTS; a++) {
        agents.push({
          x: Math.random() * cols,
          y: Math.random() * rows,
          angle: Math.random() * Math.PI * 2
        });
      }
    }

    function sense(agent, angleOffset) {
      var a = agent.angle + angleOffset;
      var sx = Math.round(agent.x + Math.cos(a) * sensorDist);
      var sy = Math.round(agent.y + Math.sin(a) * sensorDist);
      sx = ((sx % cols) + cols) % cols;
      sy = ((sy % rows) + rows) % rows;
      return trail[sx][sy];
    }

    function step() {
      // Move agents
      for (var i = 0; i < agents.length; i++) {
        var ag = agents[i];

        // Sense
        var fwd = sense(ag, 0);
        var left = sense(ag, sensorAngle);
        var right = sense(ag, -sensorAngle);

        // Steer
        if (fwd >= left && fwd >= right) {
          // keep going
        } else if (left > right) {
          ag.angle += turnSpeed * (0.5 + Math.random() * 0.5);
        } else if (right > left) {
          ag.angle -= turnSpeed * (0.5 + Math.random() * 0.5);
        } else {
          ag.angle += (Math.random() - 0.5) * turnSpeed;
        }

        // Move
        ag.x += Math.cos(ag.angle) * moveSpeed;
        ag.y += Math.sin(ag.angle) * moveSpeed;

        // Wrap
        ag.x = ((ag.x % cols) + cols) % cols;
        ag.y = ((ag.y % rows) + rows) % rows;

        // Deposit
        var gi = Math.floor(ag.x);
        var gj = Math.floor(ag.y);
        if (gi >= 0 && gi < cols && gj >= 0 && gj < rows) {
          trail[gi][gj] = Math.min(trail[gi][gj] + depositAmount, 255);
        }
      }

      // Diffuse and decay trail
      var newTrail = [];
      for (var i = 0; i < cols; i++) {
        newTrail[i] = [];
        for (var j = 0; j < rows; j++) {
          // 3x3 blur
          var sum = 0;
          for (var di = -1; di <= 1; di++) {
            for (var dj = -1; dj <= 1; dj++) {
              var ni = ((i + di) % cols + cols) % cols;
              var nj = ((j + dj) % rows + rows) % rows;
              sum += trail[ni][nj];
            }
          }
          newTrail[i][j] = (sum / 9) * decayRate;
        }
      }
      trail = newTrail;
    }

    function draw() {
      var imgData = ctx.createImageData(canvas.width, canvas.height);
      var data = imgData.data;
      for (var i = 0; i < cols; i++) {
        for (var j = 0; j < rows; j++) {
          var val = trail[i][j];
          var alpha = Math.floor(val * 0.3);
          if (alpha > 25) alpha = 25;
          if (alpha < 1) continue;
          for (var si = 0; si < scale; si++) {
            for (var sj = 0; sj < scale; sj++) {
              var px = i * scale + si;
              var py = j * scale + sj;
              if (px < canvas.width && py < canvas.height) {
                var idx = (py * canvas.width + px) * 4;
                data[idx] = 100;
                data[idx + 1] = 160;
                data[idx + 2] = 200;
                data[idx + 3] = alpha;
              }
            }
          }
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    var frameCount = 0;
    function loop() {
      frameCount++;
      step();
      if (frameCount % 2 === 0) draw();
      requestAnimationFrame(loop);
    }

    // Click to spawn a cluster of agents
    document.addEventListener('click', function (e) {
      var cx = e.clientX / scale;
      var cy = e.clientY / scale;
      for (var i = 0; i < 50; i++) {
        agents.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + (Math.random() - 0.5) * 20,
          angle: Math.random() * Math.PI * 2
        });
      }
    });

    // Mouse deposits pheromone directly
    var lastMove = 0;
    document.addEventListener('mousemove', function (e) {
      var now = Date.now();
      if (now - lastMove < 50) return;
      lastMove = now;
      var cx = Math.floor(e.clientX / scale);
      var cy = Math.floor(e.clientY / scale);
      for (var di = -2; di <= 2; di++) {
        for (var dj = -2; dj <= 2; dj++) {
          var ni = ((cx + di) % cols + cols) % cols;
          var nj = ((cy + dj) % rows + rows) % rows;
          trail[ni][nj] = Math.min(trail[ni][nj] + 30, 255);
        }
      }
    });

    window.addEventListener('resize', resize);
    resize();
    loop();
  }
})();
