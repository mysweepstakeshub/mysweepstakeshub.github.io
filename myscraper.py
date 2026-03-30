
name: Daily Sweepstakes Scraper
 
on:
  schedule:
    - cron: '0 6 * * *'  # Runs every day at 6:00 AM UTC
  workflow_dispatch:      # Also allows manual trigger from GitHub
 
jobs:
  scrape:
    runs-on: ubuntu-latest
 
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
 
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
 
      - name: Install dependencies
        run: |
          pip install requests beautifulsoup4 lxml
 
      - name: Run scraper
        run: |
          python3 scraper.py
 
      - name: Commit and push updated JSON files
        run: |
          git config --global user.name "MySweepstakesHub Bot"
          git config --global user.email "bot@mysweepstakeshub.com"
          git add site_sweepstakes.json sweepstakes_db.json pending_review.json rejected.json scraper.log || true
          git diff --staged --quiet || git commit -m "Auto-update sweepstakes listings $(date '+%Y-%m-%d')"
          git push
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
