const mqtt = require('mqtt');

// Kết nối MQTT (KHÔNG phải MQTTs)
const client = mqtt.connect('mqtt://broker.hivemq.com:1883');

let sensors = [];
const UPDATE_INTERVAL = 5000; // 5 giây

client.on('connect', () => {
  console.log('✅ Connected to HiveMQ (1883)');

  // Đăng ký lắng nghe 2 topic control
  client.subscribe('/sensors/create', () => {
    console.log('📥 Subscribed to /sensors/create');
  });
  client.subscribe('/sensors/delete', () => {
    console.log('📥 Subscribed to /sensors/delete');
  });
});

client.on('message', (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    if (topic === '/sensors/create') {
      try {
      const payload = JSON.parse(message.toString());

      if (Array.isArray(payload)) {
        payload.forEach(sensor => createSensor(sensor));
      } else {
        createSensor(payload);
      }

    } catch (err) {
      console.error('❌ Invalid payload:', message.toString());
    }
    } else if (topic === '/sensors/delete') {
      try {
        const payload = JSON.parse(message.toString());

        if (Array.isArray(payload)) {
          payload.forEach(idObj => deleteSensor(idObj.deviceCode || idObj)); // chấp nhận cả dạng [{id: "sensor-1"}] hoặc ["sensor-1"]
        } else {
          deleteSensor(payload.deviceCode || payload);
        }

      } catch (err) {
        console.error('❌ Invalid delete payload:', message.toString());
      }
    }
  } catch (err) {
    console.error('❌ Invalid message:', err.message);
  }
});

function createSensor({ deviceCode, classroomId }) {
  if (!deviceCode || !classroomId) return;

  // Không trùng lặp
  if (sensors.find(s => s.deviceCode === deviceCode)) return;

  const sensor = {
    topic: `/virtual-sensor/${deviceCode}`,
    deviceCode,
    classroomId,
    temperature: randomInRange(16, 35),
    humidity: randomInRange(30, 90),
    light: randomInRange(200, 1600),
    co2: randomInRange(900, 1600)
  };

  sensors.push(sensor);
  console.log(`✅ Created sensor ${deviceCode} in ${classroomId}`);
}

function deleteSensor(deviceCode) {
  const index = sensors.findIndex(s => s.deviceCode === deviceCode);
  if (index !== -1) {
    const [removed] = sensors.splice(index, 1);
    console.log(`🗑️ Deleted sensor ${removed.deviceCode}`);
  } else {
    console.warn(`⚠️ Sensor ${deviceCode} not found`);
  }
}

function randomize(value, min, max, amplitude) {
  const lower = Math.max(value - amplitude, min);
  const upper = Math.min(value + amplitude, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gửi dữ liệu định kỳ
setInterval(() => {
  sensors.forEach(sensor => {
    sensor.temperature = randomize(sensor.temperature, 16, 35, 1.5);
    sensor.humidity = randomize(sensor.humidity, 30, 90, 3.5);
    sensor.light = randomize(sensor.light, 200, 1600, 10.5);
    sensor.co2 = randomize(sensor.co2, 900, 1600, 5.5);

    const data = {
      deviceCode: sensor.deviceCode,
      classroomId: sensor.classroomId,
      temperature: sensor.temperature,
      humidity: sensor.humidity,
      light: sensor.light,
      co2: sensor.co2,
      timestamp: new Date().toISOString()
    };

    client.publish(sensor.topic, JSON.stringify(data), err => {
      if (err) {
        console.error(`❌ Publish failed: ${sensor.topic}`, err);
      } else {
        console.log(`📤 Published to ${sensor.topic}:`, data);
      }
    });
  });
}, UPDATE_INTERVAL);