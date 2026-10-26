
#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// -------- MOBILE HOTSPOT --------
const char* WIFI_SSID = "vivo Y31 5G";
const char* WIFI_PASSWORD = "9715433338";

// -------- I2C LCD --------
LiquidCrystal_I2C lcd(0x27, 16, 2);

// -------- HC-SR04 --------
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

// -------- MOTOR DRIVER --------
const int MOTOR_PIN = 23;

// -------- RGB LED --------
// Assumes common-cathode RGB LED
const int RED_PIN = 25;
const int GREEN_PIN = 26;
const int BLUE_PIN = 27;

// -------- BUZZER --------
const int BUZZER_PIN = 19;

// -------- TANK SETTINGS --------
const float TANK_HEIGHT = 18.0;       // cm
const float MEDIUM_THRESHOLD = 50.0;  // percent
const float HIGH_THRESHOLD = 97.0;    // percent

// HC-SR04 usable minimum distance
const float MIN_DISTANCE = 2.0;

bool motorOn = false;

// -------- WIFI CONNECTION --------
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("Connecting to hotspot");

  unsigned long startTime = millis();

  while (WiFi.status() != WL_CONNECTED &&
         millis() - startTime < 20000) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("Wi-Fi connected!");
    Serial.print("ESP32 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi connection failed.");
    Serial.println("Check hotspot name, password, and 2.4 GHz.");
  }
}

// -------- RGB LED CONTROL --------
void setRGB(bool red, bool green, bool blue) {
  digitalWrite(RED_PIN, red ? HIGH : LOW);
  digitalWrite(GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(BLUE_PIN, blue ? HIGH : LOW);
}

// -------- MOTOR CONTROL --------
void setMotor(bool on) {
  motorOn = on;
  digitalWrite(MOTOR_PIN, on ? HIGH : LOW);
}

// -------- ULTRASONIC DISTANCE --------
float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(3);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  unsigned long duration =
      pulseIn(ECHO_PIN, HIGH, 30000UL);

  if (duration == 0) {
    return -1.0;
  }

  return duration * 0.0343 / 2.0;
}

// -------- SETUP --------
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(MOTOR_PIN, OUTPUT);

  pinMode(RED_PIN, OUTPUT);
  pinMode(GREEN_PIN, OUTPUT);
  pinMode(BLUE_PIN, OUTPUT);

  pinMode(BUZZER_PIN, OUTPUT);

  setMotor(false);
  setRGB(false, false, false);
  digitalWrite(BUZZER_PIN, LOW);

  // LCD I2C: SDA = GPIO 21, SCL = GPIO 22
  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();

  lcd.setCursor(0, 0);
  lcd.print("Water Monitor");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(1500);

  connectWiFi();

  lcd.clear();

  if (WiFi.status() == WL_CONNECTED) {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Connected");
    lcd.setCursor(0, 1);
    lcd.print("Monitor Ready");
  } else {
    lcd.setCursor(0, 0);
    lcd.print("WiFi Failed");
    lcd.setCursor(0, 1);
    lcd.print("Check Hotspot");
  }

  delay(1500);
  lcd.clear();

  Serial.println("Water Level Monitor Ready");
}

// -------- MAIN LOOP --------
void loop() {
  float distanceCm = readDistance();

  // Invalid sensor reading: safe output state
  if (distanceCm < MIN_DISTANCE ||
      distanceCm > TANK_HEIGHT) {

    setMotor(false);
    setRGB(false, false, false);
    digitalWrite(BUZZER_PIN, LOW);

    lcd.setCursor(0, 0);
    lcd.print("Sensor    ");
    lcd.setCursor(0, 1);
    lcd.print("Motor: OFF      ");

    Serial.println("Motor OFF");

    delay(1000);
    return;
  }

  // Calculate water level
  float waterHeight = TANK_HEIGHT - distanceCm;

  if (waterHeight < 0) waterHeight = 0;
  if (waterHeight > TANK_HEIGHT)
    waterHeight = TANK_HEIGHT;

  float waterPercent =
      (waterHeight / TANK_HEIGHT) * 100.0;

  String level;

  // LOW: Green LED; motor ON to fill tank
  if (waterPercent < MEDIUM_THRESHOLD) {
    level = "LOW";

    setRGB(false, true, false);
    digitalWrite(BUZZER_PIN, LOW);
    setMotor(true);
  }

  // MEDIUM: Yellow LED; motor OFF
  else if (waterPercent < HIGH_THRESHOLD) {
    level = "MEDIUM";

    setRGB(true, true, false);
    digitalWrite(BUZZER_PIN, LOW);
    setMotor(false);
  }

  // HIGH: Red LED; buzzer ON; motor OFF
  else {
    level = "HIGH";

    setRGB(true, false, false);
    digitalWrite(BUZZER_PIN, HIGH);
    setMotor(false);
  }

  // -------- LCD DISPLAY --------
  lcd.setCursor(0, 0);
  lcd.print("Level:");
  lcd.print(level);
  lcd.print("         ");

  lcd.setCursor(0, 1);
  lcd.print("Fill:");
  lcd.print((int)waterPercent);
  lcd.print("% M:");
  lcd.print(motorOn ? "ON " : "OFF");

  // -------- SERIAL MONITOR --------
  Serial.print("Distance: ");
  Serial.print(distanceCm, 1);
  Serial.print(" cm | Water: ");
  Serial.print(waterPercent, 1);
  Serial.print("% | Level: ");
  Serial.print(level);
  Serial.print(" | Motor: ");
  Serial.println(motorOn ? "ON" : "OFF");

  // Retry Wi-Fi if disconnected
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
  }

  delay(1000);
}
