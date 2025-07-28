const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://test.mosquitto.org:1883');

let sensors = [];
let nextSensorId = 1;
const UPDATE_INTERVAL = 5000; 

// Connect MQTT
client.on('connect', () => {
  console.log('✅ Connected to MQTT broker');
  client.subscribe('/sensors/create', () => {
    console.log('📥 Subscribed to /sensors/create');
  });
  client.subscribe('/sensors/delete', () => {
    console.log('📥 Subscribed to /sensors/delete');
  });
});

// Handle MQTT messages
client.on('message', (topic, message) => {
  if (topic === '/sensors/create') {
    try {
      const payload = JSON.parse(message.toString());
      createSensor(payload);
    } catch (err) {
      console.error('❌ Invalid payload:', message.toString());
    }
  }
  if (topic === '/sensors/delete') {
  try {
    const payload = JSON.parse(message.toString());
    deleteSensor(payload.id);
  } catch (err) {
    console.error('❌ Invalid delete payload:', message.toString());
  }
}
});

// Create a new sensor
function createSensor(initial = {}) {
  const id = `sensor-${nextSensorId++}`;
  const topic = `/sensor/${id}`;

  const sensor = {
    id,
    topic,
    temperature: typeof initial.temperature === 'number' ? initial.temperature : randomInRange(18, 35),
    humidity: typeof initial.humidity === 'number' ? initial.humidity : randomInRange(50, 90),
    illuminance: typeof initial.illuminance === 'number' ? initial.illuminance : randomInRange(400, 1500)
  };

  sensors.push(sensor);
  console.log(`✅ Created sensor ${id}`);
}

// Delete a sensor
function deleteSensor(id) {
  const index = sensors.findIndex(sensor => sensor.id === id);
  if (index !== -1) {
    const removed = sensors.splice(index, 1)[0];
    console.log(`🗑️ Deleted sensor: ${removed.id}`);
  } else {
    console.warn(`⚠️ Sensor ${id} not found`);
  }
}

// Randomizer with boundaries
function randomizeWithBoundaries(value, min, max, amplitude) {
  const lower = Math.max(value - amplitude, min);
  const upper = Math.min(value + amplitude, max);
  return Math.floor(Math.random() * (upper - lower + 1)) + lower;
}

// Random helper
function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Randomize and publish every interval
setInterval(() => {
  console.log(`🔢 Total sensors: ${sensors.length}`);
  sensors.forEach(sensor => {
    sensor.temperature = randomizeWithBoundaries(sensor.temperature, 18, 35, 2);
    sensor.humidity = randomizeWithBoundaries(sensor.humidity, 40, 90, 4);
    sensor.illuminance = randomizeWithBoundaries(sensor.illuminance, 400, 1500, 10);

    const data = {
      sensorId: sensor.id,
      temperature: sensor.temperature,
      humidity: sensor.humidity,
      illuminance: sensor.illuminance,
      timestamp: new Date().toISOString()
    };

    client.publish(sensor.topic, JSON.stringify(data), (err) => {
  if (err) {
    console.error(`❌ Failed to publish to ${sensor.topic}:`, err);
  } else {
    console.log(`📤 Published to ${sensor.topic}:`, data);
  }
});
  });
}, UPDATE_INTERVAL);