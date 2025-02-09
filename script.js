// Canvas ayarları
const canvas = document.getElementById('game-area');
const ctx = canvas.getContext('2d');
canvas.width = 800;
canvas.height = 400;

// Oyun değişkenleri
let isGameRunning = false;
const player1Score = { value: 0 };
const player2Score = { value: 0 };
let gameMode = null; // 'score', 'time', veya 'endless'
let timeLeft = 60;
let timerInterval;
const WINNING_SCORE = 7;

// Saha özellikleri
const field = {
    x: 40, // Sahanın başlangıç x koordinatı
    y: 40, // Sahanın başlangıç y koordinatı
    width: 720, // Saha genişliği
    height: 320, // Saha yüksekliği
    cornerRadius: 0,
    centerCircleRadius: 50,
    penaltyAreaWidth: 100,
    penaltyAreaHeight: 200,
    goalDepth: 30
};

// Oyuncu özellikleri
const player1 = {
    x: 200,
    y: canvas.height / 2,
    width: 30,
    height: 50,
    speed: 4.5,
    color: '#ff0000',
    hairColor: '#4a3626',
    skinColor: '#ffd1b3',
    shoeColor: '#000000',
    shortColor: '#ffffff',
    sockColor: '#ffffff',  // Çorap rengi
    number: '9',           // Forma numarası
    head: { radius: 10 },
    legs: { width: 6, height: 15 },
    velocity: { x: 0, y: 0 },
    friction: 0.85,
    acceleration: 0.8,
    maxSpeed: 6
};

const player2 = {
    x: 600,
    y: canvas.height / 2,
    width: 30,
    height: 50,
    speed: 4.5,
    color: '#0000ff',
    hairColor: '#4a3626',
    skinColor: '#ffd1b3',
    shoeColor: '#000000',
    shortColor: '#ffffff',
    sockColor: '#ffffff',
    number: '10',
    head: { radius: 10 },
    legs: { width: 6, height: 15 },
    velocity: { x: 0, y: 0 },
    friction: 0.85,
    acceleration: 0.8,
    maxSpeed: 6
};

// Top özellikleri
const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    speedX: 0,
    speedY: 0,
    maxSpeed: 12,
    bounceCount: 0,
    friction: 0.99,
    bounceDamping: 0.8,
    spinEffect: 0.3,
    lastTouch: null // Son temas eden oyuncuyu takip etmek için
};

// Kaleler
const goals = {
    left: { 
        x: field.x - field.goalDepth, 
        y: canvas.height/2 - 50, 
        width: field.goalDepth, 
        height: 100,
        lineX: field.x
    },
    right: { 
        x: field.x + field.width, 
        y: canvas.height/2 - 50, 
        width: field.goalDepth, 
        height: 100,
        lineX: field.x + field.width - 5
    }
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

// Oyuncular arası çarpışma kontrolü için yeni fonksiyon
function checkPlayerCollision(player1, player2) {
    return !(player1.x + player1.width < player2.x || 
             player1.x > player2.x + player2.width || 
             player1.y + player1.height < player2.y || 
             player1.y > player2.y + player2.height);
}

// movePlayers fonksiyonunu güncelle
function movePlayers() {
    if (!isGameRunning) return;

    // Önceki pozisyonları kaydet
    const prevPos = {
        p1: { x: player1.x, y: player1.y },
        p2: { x: player2.x, y: player2.y }
    };

    // Oyuncu 1 (WASD)
    if (keys.w) player1.velocity.y -= player1.acceleration;
    if (keys.s) player1.velocity.y += player1.acceleration;
    if (keys.a) player1.velocity.x -= player1.acceleration;
    if (keys.d) player1.velocity.x += player1.acceleration;

    // Oyuncu 2 (Yön tuşları)
    if (keys.ArrowUp) player2.velocity.y -= player2.acceleration;
    if (keys.ArrowDown) player2.velocity.y += player2.acceleration;
    if (keys.ArrowLeft) player2.velocity.x -= player2.acceleration;
    if (keys.ArrowRight) player2.velocity.x += player2.acceleration;

    // Hız sınırlaması ve sürtünme uygula
    [player1, player2].forEach(player => {
        // Hız sınırlaması
        player.velocity.x = Math.max(Math.min(player.velocity.x, player.maxSpeed), -player.maxSpeed);
        player.velocity.y = Math.max(Math.min(player.velocity.y, player.maxSpeed), -player.maxSpeed);

        // Sürtünme uygula
        player.velocity.x *= player.friction;
        player.velocity.y *= player.friction;

        // Pozisyonu güncelle
        player.x += player.velocity.x;
        player.y += player.velocity.y;

        // Saha sınırları kontrolü
        if (player.x < field.x) player.x = field.x;
        if (player.x + player.width > field.x + field.width) player.x = field.x + field.width - player.width;
        if (player.y < field.y) player.y = field.y;
        if (player.y + player.height > field.y + field.height) player.y = field.y + field.height - player.height;
    });

    // Çarpışma kontrolü
    if (checkPlayerCollision(player1, player2)) {
        // Çarpışma varsa oyuncuları önceki pozisyonlarına geri al
        player1.x = prevPos.p1.x;
        player1.y = prevPos.p1.y;
        player2.x = prevPos.p2.x;
        player2.y = prevPos.p2.y;
        
        // Hızları sıfırla veya azalt
        player1.velocity.x *= -0.5;
        player1.velocity.y *= -0.5;
        player2.velocity.x *= -0.5;
        player2.velocity.y *= -0.5;
    }
}

// Gelişmiş çarpışma kontrolü
function checkCollision(ball, player) {
    // Oyuncunun merkezi
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;

    // Top ve oyuncu arasındaki mesafe
    const dx = ball.x - playerCenterX;
    const dy = ball.y - playerCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Çarpışma yarıçapı (oyuncu boyutlarına göre ayarlanmış)
    const collisionRadius = Math.min(player.width, player.height) / 2 + ball.radius;

    return distance <= collisionRadius;
}

// Top hareketi ve çarpışma kontrolünü güncelle
function updateBall() {
    // Topun hareketi
    ball.x += ball.speedX;
    ball.y += ball.speedY;

    // Sürtünme
    ball.speedX *= ball.friction;
    ball.speedY *= ball.friction;

    // Oyuncularla çarpışma
    [player1, player2].forEach((player, index) => {
        if (checkCollision(ball, player)) {
            // Çarpışma açısı
            const dx = ball.x - (player.x + player.width/2);
            const dy = ball.y - (player.y + player.height/2);
            const angle = Math.atan2(dy, dx);
            
            // Oyuncunun hızını topa aktar
            const playerSpeed = Math.sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
            const newSpeed = Math.min(playerSpeed + 5, ball.maxSpeed);
            
            ball.speedX = Math.cos(angle) * newSpeed + player.velocity.x * 0.3;
            ball.speedY = Math.sin(angle) * newSpeed + player.velocity.y * 0.3;

            // Spin efekti
            if (Math.abs(player.velocity.y) > 0.1) {
                ball.speedY += player.velocity.y * ball.spinEffect;
            }

            // Son vuran oyuncuyu kaydet
            ball.lastTouch = index === 0 ? 'player1' : 'player2';
        }
    });

    // Üst ve alt sınır kontrolü
    if (ball.y + ball.radius > field.y + field.height) {
        ball.y = field.y + field.height - ball.radius;
        ball.speedY = -ball.speedY * ball.bounceDamping;
        ball.speedX *= 0.95;
    } else if (ball.y - ball.radius < field.y) {
        ball.y = field.y + ball.radius;
        ball.speedY = -ball.speedY * ball.bounceDamping;
        ball.speedX *= 0.95;
    }

    // Gol kontrolü ve yan sınırlar
    if (!checkGoal()) {
        // Sol sınır kontrolü (kale dışında)
        if (ball.x - ball.radius < field.x && 
            (ball.y < goals.left.y || ball.y > goals.left.y + goals.left.height)) {
            ball.x = field.x + ball.radius;
            ball.speedX = -ball.speedX * ball.bounceDamping;
        }
        // Sağ sınır kontrolü (kale dışında)
        if (ball.x + ball.radius > field.x + field.width && 
            (ball.y < goals.right.y || ball.y > goals.right.y + goals.right.height)) {
            ball.x = field.x + field.width - ball.radius;
            ball.speedX = -ball.speedX * ball.bounceDamping;
        }
    }
}

// Topu başlangıç pozisyonuna getirme
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speedX = 0;
    ball.speedY = 0;
    ball.bounceCount = 0;
    ball.lastTouch = null;
}

// Skoru güncelleme
function updateScoreDisplay() {
    const player1ScoreElement = document.getElementById('player1-score');
    const player2ScoreElement = document.getElementById('player2-score');
    
    player1ScoreElement.textContent = player1Score.value;
    player2ScoreElement.textContent = player2Score.value;
    
    // Animasyon için class ekle
    player1ScoreElement.classList.add('updated');
    player2ScoreElement.classList.add('updated');
    
    // Animasyonu sıfırla
    setTimeout(() => {
        player1ScoreElement.classList.remove('updated');
        player2ScoreElement.classList.remove('updated');
    }, 300);
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
    // Arka plan
    ctx.fillStyle = '#1a472a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Saha zemini
    const gradient = ctx.createLinearGradient(field.x, field.y, field.x, field.y + field.height);
    gradient.addColorStop(0, '#2e8b57');
    gradient.addColorStop(1, '#236b42');
    ctx.fillStyle = gradient;
    ctx.fillRect(field.x, field.y, field.width, field.height);

    // Çim deseni
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    const stripeWidth = 30;
    for (let x = field.x; x < field.x + field.width; x += stripeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, field.y);
        ctx.lineTo(x, field.y + field.height);
        ctx.stroke();
    }

    // Saha çizgileri
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(field.x, field.y, field.width, field.height);

    // Orta çizgi
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, field.y);
    ctx.lineTo(canvas.width / 2, field.y + field.height);
    ctx.stroke();

    // Orta daire
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, field.centerCircleRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Orta nokta
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    // Penaltı alanları
    drawPenaltyArea(field.x); // Sol
    drawPenaltyArea(field.x + field.width); // Sağ

    // Kaleler
    drawGoals();
}

// Penaltı alanı çizimi
function drawPenaltyArea(x) {
    ctx.beginPath();
    if (x === field.x) {
        ctx.rect(field.x, (canvas.height - field.penaltyAreaHeight) / 2, 
                field.penaltyAreaWidth, field.penaltyAreaHeight);
    } else {
        ctx.rect(field.x + field.width - field.penaltyAreaWidth, 
                (canvas.height - field.penaltyAreaHeight) / 2,
                field.penaltyAreaWidth, field.penaltyAreaHeight);
    }
    ctx.stroke();
}

// Oyuncu çizimi
function drawPlayer(player, context = ctx) {
    // Gölge
    context.beginPath();
    context.ellipse(player.x + player.width/2, player.y + player.height + 2, 
                player.width/2, 4, 0, 0, Math.PI * 2);
    context.fillStyle = 'rgba(0, 0, 0, 0.2)';
    context.fill();

    // Ayakkabılar
    context.fillStyle = player.shoeColor;
    context.fillRect(player.x + 2, player.y + player.height - 4, 8, 6);
    context.fillRect(player.x + player.width - 10, player.y + player.height - 4, 8, 6);

    // Bacaklar
    context.fillStyle = player.skinColor;
    context.fillRect(player.x + 4, player.y + player.height - 12, 4, 8);
    context.fillRect(player.x + player.width - 8, player.y + player.height - 12, 4, 8);

    // Şort
    context.fillStyle = player.shortColor;
    context.fillRect(player.x, player.y + player.height - 22, player.width, 10);

    // Gövde (forma)
    context.fillStyle = player.color;
    context.fillRect(player.x, player.y + 8, player.width, player.height - 30);

    // Kollar
    context.fillStyle = player.skinColor;
    context.fillRect(player.x - 4, player.y + 12, 4, 8);
    context.fillRect(player.x + player.width, player.y + 12, 4, 8);

    // Kafa
    context.fillStyle = player.skinColor;
    context.beginPath();
    context.arc(player.x + player.width/2, player.y + 8, 8, 0, Math.PI * 2);
    context.fill();

    // Saç
    context.fillStyle = player.hairColor;
    context.beginPath();
    context.moveTo(player.x + player.width/2 - 8, player.y + 4);
    context.lineTo(player.x + player.width/2 + 8, player.y + 4);
    context.lineTo(player.x + player.width/2, player.y - 4);
    context.closePath();
    context.fill();
}

// Renk tonu değiştirme yardımcı fonksiyonu
function shadeColor(color, percent) {
    let R = parseInt(color.substring(1,3),16);
    let G = parseInt(color.substring(3,5),16);
    let B = parseInt(color.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    const RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    const GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    const BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

// Top çizimi
function drawBall() {
    // Gölge
    ctx.beginPath();
    ctx.ellipse(ball.x, ball.y + ball.radius + 3, ball.radius, ball.radius/3, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fill();

    // Top
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    const gradient = ctx.createRadialGradient(
        ball.x - ball.radius/3, ball.y - ball.radius/3, 0,
        ball.x, ball.y, ball.radius
    );
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, '#e0e0e0');
    ctx.fillStyle = gradient;
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
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.stroke();

    // Hareket efekti
    if (Math.abs(ball.speedX) > 1 || Math.abs(ball.speedY) > 1) {
        ctx.beginPath();
        ctx.moveTo(ball.x - ball.speedX * 2, ball.y - ball.speedY * 2);
        ctx.lineTo(ball.x, ball.y);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = ball.radius;
        ctx.stroke();
    }
}

// Oyun döngüsünü güncelle
function gameLoop() {
    if (canvas.style.display !== 'none') { // Canvas görünür ise çiz
        // Her zaman çiz
        draw();
        
        // Sadece oyun aktifse fizik hesaplamalarını yap
        if (isGameRunning) {
            movePlayers();
            updateBall();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// Oyuncu isimleri için değişkenler
let player1Name = "PLAYER 1";
let player2Name = "PLAYER 2";

// Karakter tanımlamaları
const characters = {
    turkey: {
        name: 'Türkiye',
        primaryColor: '#FF0000',
        secondaryColor: '#FFFFFF',
        skinColor: '#ffd1b3',
        hairColor: '#4a3626'
    },
    brazil: {
        name: 'Brezilya',
        primaryColor: '#FFF000',
        secondaryColor: '#00FF00',
        skinColor: '#8d5524',
        hairColor: '#000000'
    },
    argentina: {
        name: 'Arjantin',
        primaryColor: '#75AADB',
        secondaryColor: '#FFFFFF',
        skinColor: '#ffd1b3',
        hairColor: '#4a3626'
    },
    france: {
        name: 'Fransa',
        primaryColor: '#002395',
        secondaryColor: '#FFFFFF',
        skinColor: '#ffd1b3',
        hairColor: '#000000'
    },
    germany: {
        name: 'Almanya',
        primaryColor: '#000000',
        secondaryColor: '#FFFFFF',
        skinColor: '#ffd1b3',
        hairColor: '#FFD700'
    },
    spain: {
        name: 'İspanya',
        primaryColor: '#FF0000',
        secondaryColor: '#FFD700',
        skinColor: '#ffd1b3',
        hairColor: '#4a3626'
    }
};

let player1Character = 'turkey';
let player2Character = 'brazil';

// Karakter önizlemelerini çiz
function drawCharacterPreview(canvas, character) {
    const ctx = canvas.getContext('2d');
    canvas.width = 100; // Sabit genişlik
    canvas.height = 100; // Sabit yükseklik
    
    // Arka plan
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Mini karakter çizimi
    const miniPlayer = {
        x: 35,
        y: 20,
        width: 30,
        height: 50,
        color: characters[character].primaryColor,
        shortColor: characters[character].secondaryColor,
        skinColor: characters[character].skinColor,
        hairColor: characters[character].hairColor,
        shoeColor: '#000000'
    };
    
    drawPlayer(miniPlayer, ctx);
    
    // Ülke ismi
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(characters[character].name, canvas.width/2, 90);
}

// Tüm karakter önizlemelerini çiz
function initializeCharacterPreviews() {
    Object.keys(characters).forEach(country => {
        const canvas1 = document.getElementById(`preview-${country}-1`);
        const canvas2 = document.getElementById(`preview-${country}-2`);
        drawCharacterPreview(canvas1, country);
        drawCharacterPreview(canvas2, country);
    });
}

// Karakter seçimi için event listener'lar
document.querySelectorAll('.character-preview').forEach(preview => {
    preview.addEventListener('click', function() {
        const country = this.dataset.country;
        const isPlayer1 = this.id.endsWith('-1');
        
        // Seçili karakteri güncelle
        if (isPlayer1) {
            player1Character = country;
            player1.color = characters[country].primaryColor;
            player1.shortColor = characters[country].secondaryColor;
            player1.skinColor = characters[country].skinColor;
            player1.hairColor = characters[country].hairColor;
            
            // Seçili karakteri görsel olarak işaretle
            document.querySelectorAll('[id$="-1"]').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        } else {
            player2Character = country;
            player2.color = characters[country].primaryColor;
            player2.shortColor = characters[country].secondaryColor;
            player2.skinColor = characters[country].skinColor;
            player2.hairColor = characters[country].hairColor;
            
            // Seçili karakteri görsel olarak işaretle
            document.querySelectorAll('[id$="-2"]').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        }
    });
});

// Geri sayım fonksiyonunu güncelle
function startGameWithMode(mode) {
    gameMode = mode;
    hideMenu();
    showGame();
    resetGame();
    
    // Timer'ı kontrol et
    const timerElement = document.getElementById('timer');
    if (mode === 'time') {
        timerElement.style.display = 'block';
        startTimer();
    } else {
        timerElement.style.display = 'none';
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        // Timer değerini sıfırla
        const timerValueElement = timerElement.querySelector('.timer-value');
        timerValueElement.textContent = '60';
        timeLeft = 60;
    }
    
    // İsimleri al ve ayarla
    const p1NameInput = document.getElementById('player1-name');
    const p2NameInput = document.getElementById('player2-name');
    
    // İsimleri büyük harfe dönüştür
    player1Name = p1NameInput.value.trim().toUpperCase() || "PLAYER 1";
    player2Name = p2NameInput.value.trim().toUpperCase() || "PLAYER 2";
    
    player1Name = player1Name.substring(0, 12);
    player2Name = player2Name.substring(0, 12);
    
    // Skor paneli ve kontrol panelindeki isimleri güncelle
    updatePlayerNames();
    updateControlNames();

    // Oyuncuları başlangıç pozisyonlarına getir
    player1.x = 200;
    player1.y = canvas.height / 2 - player1.height / 2;
    player2.x = 600;
    player2.y = canvas.height / 2 - player2.height / 2;
    
    // Topu ortaya koy ve oyunu başlat
    resetBall();
    isGameRunning = true;
}

// İsimleri güncellemek için yeni fonksiyon
function updatePlayerNames() {
    const p1NameElement = document.querySelector('.player1 .player-name');
    const p2NameElement = document.querySelector('.player2 .player-name');
    
    p1NameElement.textContent = player1Name;
    p2NameElement.textContent = player2Name;
}

// Kontrol panelindeki isimleri güncellemek için yeni fonksiyon
function updateControlNames() {
    const player1Control = document.querySelector('.player-controls .player:first-child span');
    const player2Control = document.querySelector('.player-controls .player:last-child span');
    
    player1Control.textContent = `${player1Name}:`;
    player2Control.textContent = `${player2Name}:`;
}

// endGame fonksiyonunu güncelle
function endGame() {
    isGameRunning = false;
    const player1FinalScore = player1Score.value;
    const player2FinalScore = player2Score.value;
    
    const winAnim = document.createElement('div');
    winAnim.className = 'win-animation';
    
    const textContainer = document.createElement('div');
    textContainer.className = 'win-text';
    
    const message = document.createElement('div');
    message.className = 'win-message';
    
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'win-buttons';
    
    const playAgainButton = document.createElement('button');
    playAgainButton.className = 'menu-button';
    playAgainButton.textContent = 'TEKRAR OYNA';
    playAgainButton.onclick = () => {
        winAnim.remove();
        resetGame();
        resetScores();
        isGameRunning = true;
    };
    
    const menuButton = document.createElement('button');
    menuButton.className = 'menu-button';
    menuButton.textContent = 'MENÜYE DÖN';
    menuButton.onclick = () => {
        winAnim.remove();
        showMenu();
        document.getElementById('player1-name').value = '';
        document.getElementById('player2-name').value = '';
    };

    if (player1FinalScore > player2FinalScore) {
        textContainer.innerHTML = `<span class="winner-name">${player1Name}</span>KAZANDI!`;
        message.textContent = `${player1FinalScore} - ${player2FinalScore}`;
    } else if (player2FinalScore > player1FinalScore) {
        textContainer.innerHTML = `<span class="winner-name">${player2Name}</span>KAZANDI!`;
        message.textContent = `${player1FinalScore} - ${player2FinalScore}`;
    } else {
        textContainer.innerHTML = `<div class="draw-text">BERABERE!</div>`;
        message.textContent = `${player1FinalScore} - ${player2FinalScore}`;
    }
    
    buttonsContainer.appendChild(playAgainButton);
    buttonsContainer.appendChild(menuButton);
    winAnim.appendChild(textContainer);
    winAnim.appendChild(message);
    winAnim.appendChild(buttonsContainer);
    document.body.appendChild(winAnim);
}

// DOM elementleri
const menuElement = document.getElementById('menu');
const gameContainer = document.getElementById('game-container');
const timerElement = document.getElementById('timer');
const menuBtn = document.getElementById('menu-btn');

// Menü butonları için event listener'lar
document.getElementById('mode-score').addEventListener('click', () => {
    startGameWithMode('score');
});

document.getElementById('mode-time').addEventListener('click', () => {
    startGameWithMode('time');
});

document.getElementById('mode-endless').addEventListener('click', () => {
    startGameWithMode('endless');
});

menuBtn.addEventListener('click', showMenu);

function showMenu() {
    isGameRunning = false;
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    resetGame();
    menuElement.style.display = 'block';
    gameContainer.style.display = 'none';
    canvas.style.display = 'none'; // Canvas'ı gizle
}

function hideMenu() {
    menuElement.style.display = 'none';
}

function showGame() {
    gameContainer.style.display = 'block';
    canvas.style.display = 'block'; // Canvas'ı göster
}

function resetScores() {
    player1Score.value = 0;
    player2Score.value = 0;
    updateScoreDisplay();
}

function startTimer() {
    const timerElement = document.getElementById('timer');
    const timerValueElement = timerElement.querySelector('.timer-value');
    timerElement.style.display = 'block';
    timeLeft = 60;
    
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timeLeft--;
        timerValueElement.textContent = timeLeft;
        
        if (timeLeft <= 10) {
            timerElement.style.animation = 'pulse 1s infinite';
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.style.animation = '';
            endGame();
        }
    }, 1000);
}

function checkWinCondition() {
    if (gameMode === 'score' && (player1Score.value >= WINNING_SCORE || player2Score.value >= WINNING_SCORE)) {
        endGame();
    }
}

// Kale çizimi
function drawGoals() {
    // Kale ağı deseni
    const drawNet = (x, y, width, height) => {
        const gridSize = 10;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        
        // Dikey çizgiler
        for (let i = 0; i <= width; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x + i, y);
            ctx.lineTo(x + i, y + height);
            ctx.stroke();
        }
        
        // Yatay çizgiler
        for (let i = 0; i <= height; i += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, y + i);
            ctx.lineTo(x + width, y + i);
            ctx.stroke();
        }
    };

    // Sol kale
    ctx.fillStyle = 'rgba(50, 50, 50, 0.3)';
    ctx.fillRect(goals.left.x, goals.left.y, goals.left.width, goals.left.height);
    drawNet(goals.left.x, goals.left.y, goals.left.width, goals.left.height);

    // Sağ kale
    ctx.fillRect(goals.right.x, goals.right.y, goals.right.width, goals.right.height);
    drawNet(goals.right.x, goals.right.y, goals.right.width, goals.right.height);

    // Kale direkleri
    ctx.fillStyle = 'white';
    
    // Sol kale direkleri
    ctx.fillRect(goals.left.lineX, goals.left.y, 5, 5); // Üst direk
    ctx.fillRect(goals.left.lineX, goals.left.y + goals.left.height - 5, 5, 5); // Alt direk
    
    // Sağ kale direkleri
    ctx.fillRect(goals.right.lineX - 5, goals.right.y, 5, 5); // Üst direk
    ctx.fillRect(goals.right.lineX - 5, goals.right.y + goals.right.height - 5, 5, 5); // Alt direk
}

// Oyunu sıfırlama
function resetGame() {
    isGameRunning = false;
    player1.x = 200;
    player1.y = canvas.height / 2 - player1.height / 2;
    player2.x = 600;
    player2.y = canvas.height / 2 - player2.height / 2;
    resetBall();
    resetScores();
}

// Sayfa yüklendiğinde karakter önizlemelerini başlat
window.addEventListener('load', () => {
    initializeCharacterPreviews();
    canvas.width = 800;
    canvas.height = 400;
    showMenu();
    resetGame();
    gameLoop();
    
    // Enter tuşuna basıldığında oyunu başlatma
    document.getElementById('player2-name').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('mode-score').click();
        }
    });
});

// CSS animasyonu için style tag'i ekle
const style = document.createElement('style');
style.textContent = `
@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}
`;
document.head.appendChild(style);

// Gol animasyonu fonksiyonunu güncelle
function showGoalAnimation() {
    isGameRunning = false;
    
    const goalAnim = document.createElement('div');
    goalAnim.className = 'goal-animation';
    
    // Ana GOL! yazısı
    const goalText = document.createElement('div');
    goalText.className = 'goal-text';
    goalText.textContent = 'GOL!';
    goalAnim.appendChild(goalText);
    
    document.body.appendChild(goalAnim);

    // 2 saniye sonra animasyonu kaldır ve oyunu devam ettir
    setTimeout(() => {
        goalAnim.remove();
        player1.x = 200;
        player1.y = canvas.height / 2 - player1.height / 2;
        player2.x = 600;
        player2.y = canvas.height / 2 - player2.height / 2;
        resetBall();
        isGameRunning = true;
    }, 2000);
}

// Gol kontrolü fonksiyonunu güncelle
function checkGoal() {
    // Sol kaleye gol - sadece kale çizgisini geçtiğinde
    if (ball.x - ball.radius < goals.left.lineX && 
        ball.x + ball.radius > goals.left.x &&
        ball.y > goals.left.y && 
        ball.y < goals.left.y + goals.left.height) {
        player2Score.value++;
        updateScoreDisplay();
        showGoalAnimation();
        checkWinCondition();
        return true;
    }
    
    // Sağ kaleye gol - sadece kale çizgisini geçtiğinde
    if (ball.x + ball.radius > goals.right.lineX && 
        ball.x - ball.radius < goals.right.x + goals.right.width &&
        ball.y > goals.right.y && 
        ball.y < goals.right.y + goals.right.height) {
        player1Score.value++;
        updateScoreDisplay();
        showGoalAnimation();
        checkWinCondition();
        return true;
    }
    return false;
} 