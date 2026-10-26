# WireWizards_AquaSense
Multi-Level Water Tank Indicator -	Measure water level at several points in a tank and show low, medium, and high levels using LEDs, a display, or an alarm.
📌 Overview:
      This project uses an ESP32 and an HC-SR04 ultrasonic sensor to measure the water level in a tank without direct contact with water. An RGB LED indicates LOW, MEDIUM, and HIGH levels, while alerts are sent through the web dashboard when the tank reaches a high level.

🎯 Features:
        1.Contactless water-level measurement
        2.Three-level indication using an RGB LED
        3.Dashboard alert for high water levels
        4.Adjustable water-level thresholds
        5.Low-cost and simple design

🧰 Components Required:
        1.ESP32 development board
        2.HC-SR04 ultrasonic sensor
        3.RGB LED
        4.Resistor
        5.Breadboard and jumper wires

⚙️ Working Principle:
        The ultrasonic sensor measures the distance to the water surface. The ESP32 calculates the water height and classifies it as LOW, MEDIUM, or HIGH.

        Water Level               RGB LED              Alert

          LOW                     Green                OFF

         MEDIUM                   Blue                 OFF

          HIGH                    Red                  ON
