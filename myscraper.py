import json
import os
import requests
from bs4 import BeautifulSoup
from datetime import datetime

DB_FILE = 'sweepstakes_db.json'

# --- THE JUNK FILTER ---
# PCH has been added here so it is blocked forever.
JUNK_WORDS = [
    "pch", "publishers clearing house", "survey", "consultation", 
    "quote", "insurance", "call now", "winner list", "claim your prize", 
    "urgent", "selected", "act now", "viagra", "money fast", "guaranteed winner"
]

def is_junk(title):
    """Checks if the title contains any junk keywords."""
    for word in JUNK_WORDS:
        if word in title.lower():
            return True
    return False

def scrape_sites():
    print("Starting smart scrape (PCH Blocked)...")
    new_entries = []
    
    # These are the sites we are watching
    sources = [
        "https://www.contestgirl.com",
        "https://www.infinitesweeps.com",
        "https://www.sweepstakesadvantage.com"
    ]

    # TEST: Let's try to add a PCH entry to prove it gets blocked
    test_entry = {
        "title": "PCH Superprize Giveaway",
        "url": "https://pch.com",
        "source": "PCH",
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "status": "approved"
    }
    
    if is_junk(test_entry["title"]):
        print(f"BANNED: Skipping {test_entry['title']} because it is PCH.")
    else:
        new_entries.append(test_entry)

    # Example of a GOOD entry that will pass
    good_entry = {
        "title": "Win a New Backyard Grill",
        "url": "https://example.com/grill",
        "source": "Contest Girl",
        "date_added": datetime.now().strftime("%Y-%m-%d"),
        "status": "approved"
    }
    
    if not is_junk(good_entry["title"]):
        new_entries.append(good_entry)

    return new_entries

def save_to_db(new_entries):
    if not new_entries:
        return

    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r') as f:
            try:
                data = json.load(f)
            except:
                data = []
    else:
        data = []

    existing_titles = [e.get('title') for e in data]
    
    for entry in new_entries:
        if entry['title'] not in existing_titles:
            data.append(entry)
            print(f"Added: {entry['title']}")

    with open(DB_FILE, 'w') as f:
        json.dump(data, f, indent=4)

if __name__ == "__main__":
    results = scrape_sites()
    save_to_db(results)
