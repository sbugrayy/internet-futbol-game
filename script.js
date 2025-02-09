// Canvas ayarları
const canvas = document.getElementById('game-area');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// Oyun değişkenleri
let isGameRunning = false;
const player1Score = { value: 0 };
const player2Score = { value: 0 };

// Saha özellikleri (Bu kısmı ekleyin - en üstteki değişkenlerle birlikte)
const field = {
    cornerRadius: 40,
    centerCircleRadius: 50,
    penaltyAreaWidth: 100,
    penaltyAreaHeight: 200,
    goalDepth: 20
};

// Oyuncu özellikleri
const player1 = {
    x: 200,
    y: canvas.height / 2,
    width: 20,
    height: 40,
    speed: 3.5,
    color: '#ff0000',
    head: { radius: 8 },
    legs: { width: 4, height: 15 }
};

const player2 = {
    x: 600,
    y: canvas.height / 2,
    width: 20,
    height: 40,
    speed: 3.5,
    color: '#0000ff',
    head: { radius: 8 },
    legs: { width: 4, height: 15 }
};

// Top özellikleri
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 8,
    speedX: 0,
    speedY: 0,
    maxSpeed: 10,
    bounceCount: 0,
    friction: 0.99,
    bounceDamping: 0.85,
    spinEffect: 0.2
};

// Kaleler (mevcut goals nesnesini güncelleyelim)
const goals = {
    left: { x: 0, y: canvas.height/2 - 50, width: 10, height: 100 },
    right: { x: canvas.width - 10, y: canvas.height/2 - 50, width: 10, height: 100 }
};

// Tuş kontrolleri
const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Event Listener'lar
document.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

document.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Oyuncuları hareket ettirme
function movePlayers() {
    // Oyuncu 1 (WASD)
    if (keys.w && player1.y > 0) player1.y -= player1.speed;
    if (keys.s && player1.y < canvas.height - player1.height) player1.y += player1.speed;
    if (keys.a && player1.x > 0) player1.x -= player1.speed;
    if (keys.d && player1.x < canvas.width - player1.width) player1.x += player1.speed;

    // Oyuncu 2 (Yön tuşları)
    if (keys.ArrowUp && player2.y > 0) player2.y -= player2.speed;
    if (keys.ArrowDown && player2.y < canvas.height - player2.height) player2.y += player2.speed;
    if (keys.ArrowLeft && player2.x > 0) player2.x -= player2.speed;
    if (keys.ArrowRight && player2.x < canvas.width - player2.width) player2.x += player2.speed;
}

// Çarpışma kontrolü
function checkCollision(circle, rect) {
    let testX = circle.x;
    let testY = circle.y;

    if (circle.x < rect.x) testX = rect.x;
    else if (circle.x > rect.x + rect.width) testX = rect.x + rect.width;
    if (circle.y < rect.y) testY = rect.y;
    else if (circle.y > rect.y + rect.height) testY = rect.y + rect.height;

    const distX = circle.x - testX;
    const distY = circle.y - testY;
    const distance = Math.sqrt((distX * distX) + (distY * distY));

    return distance <= circle.radius;
}

// Top hareketi ve çarpışma kontrolü
function updateBall() {
    // Topun hareketi
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Gelişmiş sürtünme
    ball.speedX *= ball.friction;
    ball.speedY *= ball.friction;

    // Duvarlardan sekme (gelişmiş)
    if (ball.y + ball.radius > canvas.height) {
        ball.y = canvas.height - ball.radius;
        ball.speedY = -ball.speedY * ball.bounceDamping;
        ball.speedX *= 0.95; // Yatay hız kaybı
        ball.bounceCount++;
    } else if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.speedY = -ball.speedY * ball.bounceDamping;
        ball.speedX *= 0.95;
        ball.bounceCount++;
    }

    // Yavaşlama efekti
    if (Math.abs(ball.speedX) < 0.1) ball.speedX = 0;
    if (Math.abs(ball.speedY) < 0.1) ball.speedY = 0;

    // Oyuncularla çarpışma (gelişmiş)
    [player1, player2].forEach(player => {
        if (checkCollision(ball, player)) {
            const dx = ball.x - (player.x + player.width/2);
            const dy = ball.y - (player.y + player.height/2);
            const angle = Math.atan2(dy, dx);
            
            // Çarpışma açısına göre hız hesaplama
            const speed = Math.sqrt(ball.speedX * ball.speedX + ball.speedY * ball.speedY);
            const newSpeed = Math.min(speed + 2, ball.maxSpeed);
            
            ball.speedX = Math.cos(angle) * newSpeed;
            ball.speedY = Math.sin(angle) * newSpeed;

            // Spin efekti
            if (keys.w || keys.s || keys.ArrowUp || keys.ArrowDown) {
                ball.speedY += (keys.w || keys.ArrowUp ? -1 : 1) * ball.spinEffect;
            }
        }
    });

    // Gol kontrolü
    if (ball.x - ball.radius < goals.left.x + goals.left.width) {
        if (ball.y > goals.left.y && ball.y < goals.left.y + goals.left.height) {
            player2Score.value++;
            resetBall();
            updateScoreDisplay();
        }
    }
    if (ball.x + ball.radius > goals.right.x) {
        if (ball.y > goals.right.y && ball.y < goals.right.y + goals.right.height) {
            player1Score.value++;
            resetBall();
            updateScoreDisplay();
        }
    }

    // Topun sınırlar içinde kalması
    if (ball.x - ball.radius < 0) {
        ball.x = ball.radius;
        ball.speedX *= -ball.bounceDamping;
    } else if (ball.x + ball.radius > canvas.width) {
        ball.x = canvas.width - ball.radius;
        ball.speedX *= -ball.bounceDamping;
    }
}

// Topu başlangıç pozisyonuna getirme
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0;
    ball.speedY = 0;
}

// Skoru güncelleme
function updateScoreDisplay() {
    document.getElementById('player1-score').textContent = `Oyuncu 1: ${player1Score.value}`;
    document.getElementById('player2-score').textContent = `Oyuncu 2: ${player2Score.value}`;
}

// Çizim fonksiyonları
function draw() {
    // Sahayı temizle
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Saha çizimi
    drawField();
    
    // Oyuncuları çiz
    drawPlayer(player1);
    drawPlayer(player2);

    // Topu çiz
    drawBall();
}

// Saha çizimi
function drawField() {
    // Ana saha zemini
    ctx.fillStyle = '#2e8b57';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;

    // Orta çizgi
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Orta daire
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, field.centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Penaltı alanları
    drawPenaltyArea(0); // Sol
    drawPenaltyArea(canvas.width); // Sağ

    // Kaleler
    ctx.fillStyle = 'white';
    // Sol kale
    ctx.fillRect(0, goals.left.y - 10, goals.left.width + field.goalDepth, goals.left.height + 20);
    // Sağ kale
    ctx.fillRect(goals.right.x - field.goalDepth, goals.right.y - 10, goals.right.width + field.goalDepth, goals.right.height + 20);
}

// Penaltı alanı çizimi
function drawPenaltyArea(x) {
    ctx.beginPath();
    if (x === 0) {
        ctx.rect(0, (canvas.height - field.penaltyAreaHeight) / 2, 
                field.penaltyAreaWidth, field.penaltyAreaHeight);
    } else {
        ctx.rect(canvas.width - field.penaltyAreaWidth, 
                (canvas.height - field.penaltyAreaHeight) / 2,
                field.penaltyAreaWidth, field.penaltyAreaHeight);
    }
    ctx.stroke();
}

// Oyuncu çizimi
function drawPlayer(player) {
    // Bacaklar
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x + player.width / 4 - player.legs.width / 2,
                player.y + player.height,
                player.legs.width, player.legs.height);
    ctx.fillRect(player.x + 3 * player.width / 4 - player.legs.width / 2,
                player.y + player.height,
                player.legs.width, player.legs.height);

    // Gövde
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Kafa
    ctx.beginPath();
    ctx.arc(player.x + player.width / 2, player.y - player.head.radius / 2,
            player.head.radius, 0, Math.PI * 2);
    ctx.fill();
}

// Top çizimi
function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top deseni
    ctx.beginPath();
    ctx.moveTo(ball.x - ball.radius, ball.y);
    ctx.lineTo(ball.x + ball.radius, ball.y);
    ctx.moveTo(ball.x, ball.y - ball.radius);
    ctx.lineTo(ball.x, ball.y + ball.radius);
    ctx.stroke();
}

// Oyun döngüsü
function gameLoop() {
    if (isGameRunning) {
        movePlayers();
        updateBall();
        draw();
        requestAnimationFrame(gameLoop);
    }
}

// Oyunu başlatma
function startGame() {
    if (!isGameRunning) {
        isGameRunning = true;
        player1Score.value = 0;
        player2Score.value = 0;
        
        // Oyuncuları başlangıç pozisyonlarına getirelim
        player1.x = 200;
        player1.y = canvas.height / 2 - player1.height / 2;
        player2.x = 600;
        player2.y = canvas.height / 2 - player2.height / 2;
        
        updateScoreDisplay();
        resetBall();
        gameLoop();
        document.getElementById('start-btn').textContent = 'Oyunu Yeniden Başlat';
    } else {
        resetGame();
    }
}

// Oyunu sıfırlama
function resetGame() {
    player1.x = 200;
    player1.y = canvas.height / 2 - player1.height / 2;
    player2.x = 600;
    player2.y = canvas.height / 2 - player2.height / 2;
    resetBall();
    updateScoreDisplay();
}

// Start butonunu dinle
document.getElementById('start-btn').addEventListener('click', startGame); 