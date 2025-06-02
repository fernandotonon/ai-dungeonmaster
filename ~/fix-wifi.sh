#!/bin/bash

echo "Fixing WiFi connectivity issues..."

# Disable power management
sudo iwconfig wlx90de806af4fa power off

# Reset the USB WiFi adapter
echo "Resetting USB WiFi adapter..."
sudo usb_modeswitch -R -v 0bda -p b812

# Wait a moment
sleep 2

# Check connection status
iwconfig wlx90de806af4fa

echo "WiFi fix completed. Power management disabled." 