#!/usr/bin/env python3
"""Extract English aboutDetransition text for translation."""
import json

with open('messages/en.json', 'r') as f:
    data = json.load(f)

about = data['home']['aboutDetransition']
for key, value in about.items():
    print(f"{key}:{value}")
