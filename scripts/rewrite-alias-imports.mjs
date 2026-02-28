// ====== LIBRARY ======
#include <WiFi.h>
#include <PubSubClient.h>

// ====== WIFI CONFIG (GANTI SENDIRI) ======
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_KAMU";

// ====== MQTT CONFIG (SAMA DENGAN WEBSITE) ======
const char* MQTT_SERVER = "broker.hivemq.com";
const uint16_t MQTT_PORT = 1883;   // TCP MQTT

// Topic virtual pin
const char* TOPIC_V1 = "agv/raenaldiAS/vpin/V1";  // Load (KG)
const char* TOPIC_V2 = "agv/raenaldiAS/vpin/V2";  // Light (%)
const char* TOPIC_V3 = "agv/raenaldiAS/vpin/V3";  // Battery (%)
const char* TOPIC_V4 = "agv/raenaldiAS/vpin/V4";  // Status
const char* TOPIC_V5 = "agv/raenaldiAS/vpin/V5";  // Command START/STOP

// ====== HARDWARE PIN (SESUAIKAN) ======
const int LDR_PIN       = 34;   // ADC LDR
const int MOTOR_EN_PIN  = 25;   // Enable motor driver
const int MOTOR_DIR_PIN = 26;   // Arah motor (opsional)

// ====== GLOBAL OBJECT ======
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// ====== STATE ======
String agvStatus = "STOPPED";      // "STOPPED" atau "RUNNING"
unsigned long lastPublish = 0;     // interval publish sensor

// ====== FUNGSI STATUS ======
void publishStatus() {
  mqttClient.publish(TOPIC_V4, agvStatus.c_str(), true);
  Serial.print("[MQTT] Status -> ");
  Serial.println(agvStatus);
}

// ====== FUNGSI MOTOR ======
void startMotor() {
  digitalWrite(MOTOR_EN_PIN, HIGH);
  digitalWrite(MOTOR_DIR_PIN, HIGH);   // ubah sesuai arah yang kamu mau
  agvStatus = "RUNNING";
  publishStatus();
}

void stopMotor() {
  digitalWrite(MOTOR_EN_PIN, LOW);
  agvStatus = "STOPPED";
  publishStatus();
}

// ====== WIFI SETUP ======
void setupWifi() {
  delay(100);
  Serial.println();
  Serial.print("Menghubungkan ke WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retry = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    if (++retry > 60) {      // ~30 detik
      Serial.println("\nWiFi gagal, restart ESP...");
      ESP.restart();
    }
  }

  Serial.println("\nWiFi terhubung");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
}

// ====== CALLBACK MQTT (TERIMA PERINTAH DARI WEBSITE) ======
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();

  Serial.print("[MQTT] Topic: ");
  Serial.print(topic);
  Serial.print(" | Payload: ");
  Serial.println(msg);

  if (String(topic) == TOPIC_V5) {
    msg.toUpperCase();
    if (msg == "START") {
      Serial.println("Perintah START diterima");
      startMotor();
    } else if (msg == "STOP") {
      Serial.println("Perintah STOP diterima");
      stopMotor();
    }
  }
}

// ====== RECONNECT MQTT ======
void mqttReconnect() {
  while (!mqttClient.connected()) {
    Serial.print("Menghubungkan ke MQTT... ");
    String clientId = "ESP32-AGV-";
    clientId += String(random(0xffff), HEX);

    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("TERHUBUNG");
      mqttClient.subscribe(TOPIC_V5);
      Serial.print("Subscribe: ");
      Serial.println(TOPIC_V5);

      publishStatus();   // kirim status awal
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" coba lagi 3 detik...");
      delay(3000);
    }
  }
}

// ====== PUBLISH DATA SENSOR KE WEBSITE ======
void publishSensors() {
  char buf[16];

  // --- Load Cell (KG) ---
  // TODO: ganti dengan pembacaan sensor asli (HX711, dll)
  float loadKg = 0.00;   // dummy
  dtostrf(loadKg, 1, 2, buf);
  mqttClient.publish(TOPIC_V1, buf, true);
  Serial.print("[MQTT] V1 Load(kg): ");
  Serial.println(buf);

  // --- LDR (% cahaya) ---
  int rawLdr = analogRead(LDR_PIN);        // 0..4095
  int lightPercent = map(rawLdr, 0, 4095, 0, 100);
  snprintf(buf, sizeof(buf), "%d", lightPercent);
  mqttClient.publish(TOPIC_V2, buf, true);
  Serial.print("[MQTT] V2 Light(%): ");
  Serial.println(buf);

  // --- Baterai (%) ---
  // TODO: ganti dengan pembacaan ADC baterai yang sebenarnya
  int batteryPercent = 100;                // dummy
  snprintf(buf, sizeof(buf), "%d", batteryPercent);
  mqttClient.publish(TOPIC_V3, buf, true);
  Serial.print("[MQTT] V3 Battery(%): ");
  Serial.println(buf);

  // --- Status (V4) ---
  publishStatus();
}

// ====== SETUP ======
void setup() {
  Serial.begin(115200);
  delay(1000);
  randomSeed(micros());

  pinMode(LDR_PIN, INPUT);
  pinMode(MOTOR_EN_PIN, OUTPUT);
  pinMode(MOTOR_DIR_PIN, OUTPUT);

  stopMotor();           // mulai dari keadaan STOPPED

  setupWifi();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

// ====== LOOP ======
void loop() {
  if (!mqttClient.connected()) {
    mqttReconnect();
  }
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastPublish > 1000) {   // kirim setiap 1 detik
    lastPublish = now;
    publishSensors();
  }
}