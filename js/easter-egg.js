(() => {
    const trigger = document.getElementById("easter-egg-trigger");
    const modal = document.getElementById("modal-easter-egg");
    const arena = document.getElementById("easter-egg-arena");
    const coin = document.getElementById("easter-egg-coin");
    const scoreLabel = document.getElementById("easter-egg-score");
    const timeLabel = document.getElementById("easter-egg-time");
    const message = document.getElementById("easter-egg-message");
    const restartButton = document.getElementById("btn-reintentar-easter-egg");
    const closeButtons = [
        document.getElementById("btn-cerrar-easter-egg"),
        document.getElementById("btn-salir-easter-egg")
    ];

    let activationClicks = 0;
    let lastActivationClick = 0;
    let score = 0;
    let timeLeft = 15;
    let timerId = null;
    let gameFinished = false;

    function moveCoin() {
        const horizontalSpace = arena.clientWidth - coin.offsetWidth;
        const verticalSpace = arena.clientHeight - coin.offsetHeight;
        const x = coin.offsetWidth / 2 + Math.random() * horizontalSpace;
        const y = coin.offsetHeight / 2 + Math.random() * verticalSpace;

        coin.style.left = `${x}px`;
        coin.style.top = `${y}px`;
    }

    function finishGame(won) {
        clearInterval(timerId);
        timerId = null;
        gameFinished = true;
        coin.disabled = true;
        restartButton.hidden = false;
        message.textContent = won ? "¡Lo lograste! 🏆" : "¡Se acabó el tiempo! Inténtalo otra vez.";
        restartButton.focus();
    }

    function startGame() {
        clearInterval(timerId);
        score = 0;
        timeLeft = 15;
        gameFinished = false;
        scoreLabel.textContent = score;
        timeLabel.textContent = timeLeft;
        message.textContent = "¡Vamos!";
        restartButton.hidden = true;
        coin.disabled = false;
        moveCoin();
        timerId = setInterval(() => {
            timeLeft -= 1;
            timeLabel.textContent = timeLeft;

            if (timeLeft <= 0) finishGame(false);
        }, 1000);
    }

    function closeGame() {
        clearInterval(timerId);
        timerId = null;
        modal.style.display = "none";
        trigger.focus();
    }

    function openGame() {
        modal.style.display = "flex";
        startGame();
        coin.focus();
    }

    trigger.addEventListener("click", () => {
        const now = Date.now();
        activationClicks = now - lastActivationClick <= 2500 ? activationClicks + 1 : 1;
        lastActivationClick = now;

        if (activationClicks >= 7) {
            activationClicks = 0;
            openGame();
        }
    });

    trigger.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            trigger.click();
        }
    });

    coin.addEventListener("click", () => {
        if (gameFinished) return;

        score += 1;
        scoreLabel.textContent = score;

        if (score >= 10) {
            finishGame(true);
        } else {
            moveCoin();
        }
    });

    restartButton.addEventListener("click", startGame);
    closeButtons.forEach((button) => button.addEventListener("click", closeGame));
    modal.addEventListener("click", (event) => {
        if (event.target === modal) closeGame();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && modal.style.display === "flex") closeGame();
    });
})();
