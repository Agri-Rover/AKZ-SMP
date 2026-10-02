const MQTT_BROKER = "ws://192.168.1.20:9001/mqtt";
const MQTT_TOPIC = "microplanting/sensors";

let historyData = [];
let alerts = [];

const connectionDot =
    document.getElementById("connectionDot");

const connectionText =
    document.getElementById("connectionText");

const espStatus =
    document.getElementById("espStatus");

const temperature =
    document.getElementById("temperature");

const humidity =
    document.getElementById("humidity");

const soil =
    document.getElementById("soil");

const soilRaw =
    document.getElementById("soilRaw");

const gas =
    document.getElementById("gas");

const pumpStatus =
    document.getElementById("pumpStatus");

const pumpMessage =
    document.getElementById("pumpMessage");

const lastUpdate =
    document.getElementById("lastUpdate");

const tempStatus =
    document.getElementById("tempStatus");

const humidityStatus =
    document.getElementById("humidityStatus");

const soilStatus =
    document.getElementById("soilStatus");

const gasStatus =
    document.getElementById("gasStatus");

const tempBar =
    document.getElementById("tempBar");

const humidityBar =
    document.getElementById("humidityBar");

const gasBar =
    document.getElementById("gasBar");

const alertsContainer =
    document.getElementById("alerts");

const historyContainer =
    document.getElementById("history");


/* ============================================================
   CONNECTION
============================================================ */

function setConnection(online) {

    if (online) {

        connectionDot.className =
            "dot online";

        connectionText.textContent =
            "MQTT ONLINE";

        espStatus.textContent =
            "ONLINE";

    } else {

        connectionDot.className =
            "dot offline";

        connectionText.textContent =
            "MQTT OFFLINE";

        espStatus.textContent =
            "OFFLINE";
    }
}


/* ============================================================
   STATUS BADGES
============================================================ */

function setBadge(element, text, type) {

    element.textContent = text;

    element.className =
        "badge " + type;
}


/* ============================================================
   TIME
============================================================ */

function currentTime() {

    return new Date().toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );
}


/* ============================================================
   ALERT
============================================================ */

function addAlert(message) {

    const now = currentTime();

    alerts.unshift({
        message: message,
        time: now
    });

    if (alerts.length > 8) {
        alerts.pop();
    }

    renderAlerts();
}


function renderAlerts() {

    if (alerts.length === 0) {

        alertsContainer.innerHTML =
            `<div class="empty">
                No alerts yet.
             </div>`;

        return;
    }

    alertsContainer.innerHTML =
        alerts.map(alert => {

            return `
                <div class="alert-item">

                    <span class="alert-message">
                        🚨 ${alert.message}
                    </span>

                    <span class="alert-time">
                        ${alert.time}
                    </span>

                </div>
            `;

        }).join("");
}


/* ============================================================
   HISTORY
============================================================ */

function addHistory(data) {

    historyData.unshift({
        time: currentTime(),
        temperature: data.temperature,
        humidity: data.humidity,
        soil: data.soil,
        gas: data.gas,
        pump: data.pump
    });

    if (historyData.length > 8) {
        historyData.pop();
    }

    renderHistory();
}


function renderHistory() {

    if (historyData.length === 0) {

        historyContainer.innerHTML =
            `<div class="empty">
                Waiting for sensor data...
             </div>`;

        return;
    }

    historyContainer.innerHTML = `
        <div class="history-row">
            <strong>Time</strong>
            <strong>Temp</strong>
            <strong>Humidity</strong>
            <strong>Soil</strong>
            <strong>Gas</strong>
            <strong>Pump</strong>
        </div>

        ${historyData.map(row => `
            <div class="history-row">

                <span>${row.time}</span>

                <strong>
                    ${row.temperature}°C
                </strong>

                <strong>
                    ${row.humidity}%
                </strong>

                <strong>
                    ${row.soil}
                </strong>

                <strong>
                    ${row.gas}
                </strong>

                <strong>
                    ${row.pump}
                </strong>

            </div>
        `).join("")}
    `;
}


/* ============================================================
   SENSOR UPDATE
============================================================ */

function updateDashboard(data) {

    const temp =
        Number(data.temperature);

    const hum =
        Number(data.humidity);

    const soilValue =
        Number(data.soil_raw);

    const gasValue =
        Number(data.gas);


    /* TEMPERATURE */

    temperature.textContent =
        temp + "°C";

    tempBar.style.width =
        Math.min((temp / 50) * 100, 100) + "%";


    if (temp >= 35) {

        setBadge(
            tempStatus,
            "HIGH",
            "alert"
        );

    } else {

        setBadge(
            tempStatus,
            "NORMAL",
            "good"
        );
    }


    /* HUMIDITY */

    humidity.textContent =
        hum + "%";

    humidityBar.style.width =
        Math.min(hum, 100) + "%";

    setBadge(
        humidityStatus,
        "NORMAL",
        "good"
    );


    /* SOIL */

    soil.textContent =
        data.soil;

    soilRaw.textContent =
        soilValue;


    if (data.soil === "DRY") {

        setBadge(
            soilStatus,
            "NEEDS WATER",
            "warn"
        );

    } else {

        setBadge(
            soilStatus,
            "WET",
            "good"
        );
    }


    /* GAS */

    gas.textContent =
        gasValue;

    gasBar.style.width =
        Math.min((gasValue / 1000) * 100, 100)
        + "%";


    if (data.gas_alert === true) {

        setBadge(
            gasStatus,
            "ALERT",
            "alert"
        );

    } else {

        setBadge(
            gasStatus,
            "NORMAL",
            "good"
        );
    }


    /* PUMP */

    pumpStatus.textContent =
        data.pump;

    if (data.pump === "ON") {

        pumpStatus.className =
            "pump-status on";

        pumpMessage.textContent =
            "Automatic watering is running.";

    } else {

        pumpStatus.className =
            "pump-status off";

        pumpMessage.textContent =
            "Pump is currently stopped.";
    }


    /* TIME */

    lastUpdate.textContent =
        currentTime();


    /* ALERTS */

    if (data.gas_alert === true) {
        addAlert("Gas detected!");
    }

    if (data.temperature_alert === true) {
        addAlert("Temperature high!");
    }


    /* HISTORY */

    addHistory(data);
}


/* ============================================================
   MQTT
============================================================ */

console.log(
    "Connecting to:",
    MQTT_BROKER
);

const mqttClient = mqtt.connect(
    MQTT_BROKER,
    {
        clientId:
            "microplanting_web_" +
            Math.random()
                .toString(16)
                .substring(2),

        clean: true,

        reconnectPeriod: 3000,

        connectTimeout: 10000
    }
);


mqttClient.on("connect", function () {

    console.log(
        "MQTT connected"
    );

    setConnection(true);

    mqttClient.subscribe(
        MQTT_TOPIC,
        function (error) {

            if (error) {

                console.error(
                    "Subscribe error:",
                    error
                );

            } else {

                console.log(
                    "Subscribed to:",
                    MQTT_TOPIC
                );
            }
        }
    );
});


mqttClient.on(
    "message",
    function (topic, message) {

        try {

            const data =
                JSON.parse(
                    message.toString()
                );

            console.log(
                "Sensor data:",
                data
            );

            updateDashboard(data);

        } catch (error) {

            console.error(
                "Invalid MQTT message:",
                error
            );
        }
    }
);


mqttClient.on(
    "offline",
    function () {

        setConnection(false);
    }
);


mqttClient.on(
    "close",
    function () {

        setConnection(false);
    }
);


mqttClient.on(
    "error",
    function (error) {

        console.error(
            "MQTT error:",
            error
        );

        setConnection(false);
    }
);


renderAlerts();
renderHistory();
