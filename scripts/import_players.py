"""
France Classification System — Excel Import Script
====================================================
Maps the original French database (Excel) to the new Supabase schema
and inserts all players via the Supabase REST API.

USAGE:
  1. pip install pandas openpyxl requests
  2. Set SUPABASE_URL and SERVICE_ROLE_KEY below
  3. python import_players.py

NOTE: Use the SERVICE_ROLE KEY (not anon key) for the import.
      It is in Supabase Dashboard → Settings → API → service_role.
      Never commit this key to GitHub. Delete/revoke it after import.
"""

import pandas as pd
import requests
import json
import re
from datetime import datetime, date

# ── CONFIGURATION ────────────────────────────────────────────────────────────
SUPABASE_URL     = "https://fdeamqeejklhbyluygfy.supabase.co"
SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkZWFtcWVlamtsaGJ5bHV5Z2Z5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjI0Mzg2MywiZXhwIjoyMDkxODE5ODYzfQ.ZdVy425KmKYoFpsMwygDUl1XCzJoZSdkYv_PTC4pNKc"
EXCEL_FILE       = "../../../uploads/01-FRANCE 13 04 26 copie.xlsx"
# ─────────────────────────────────────────────────────────────────────────────

HEADERS = {
    "apikey":        SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "return=minimal"
}


def clean_str(val):
    """Return stripped string or None."""
    if val is None or (isinstance(val, float) and str(val) == 'nan'):
        return None
    s = str(val).strip()
    return s if s else None


def parse_date(val):
    """Return ISO date string (YYYY-MM-DD) or None."""
    if val is None or (isinstance(val, float) and str(val) == 'nan'):
        return None
    if isinstance(val, (datetime, date)):
        return val.strftime('%Y-%m-%d')
    s = str(val).strip()
    # Try common formats
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m-%d')
        except ValueError:
            pass
    return None


def map_classification(raw):
    """
    Convert French points (10-50) to IWBF decimal (1.0-5.0).
    Strip suffixes: 40R -> classification=4.0, class_status=Under Review
                    45 NE -> classification=4.5, class_status=Provisional
                    15/30 -> classification=1.5, notes handled separately
    Returns (classification_str, class_status_str)
    """
    if not raw:
        return None, 'Confirmed'

    raw = str(raw).strip().upper()
    if raw in ('NAN', 'NONE', ''):
        return None, 'Confirmed'

    status = 'Confirmed'

    # Strip NE (Provisional) — do FIRST, then check for R
    if 'NE' in raw:
        status = 'Provisional'
        raw = raw.replace('NE', '').replace('-', '').strip()

    # Strip R suffix (Under Review) — keep Provisional if already set
    if raw.endswith('R'):
        if status == 'Confirmed':
            status = 'Under Review'
        raw = raw[:-1].strip()

    # Strip -V suffix (classified by video — confirmed)
    if raw.endswith('-V') or raw.endswith(' V'):
        raw = raw[:-2].strip()

    # Handle slash (e.g. 15/30 — provisional double class)
    if '/' in raw:
        if status == 'Confirmed':
            status = 'Provisional'
        raw = raw.split('/')[0].strip()

    # Convert numeric
    mapping = {
        '10': '1.0', '15': '1.5', '20': '2.0', '25': '2.5',
        '30': '3.0', '35': '3.5', '40': '4.0', '45': '4.5', '50': '5.0'
    }
    return mapping.get(raw, clean_str(raw)), status


def map_junior(jj_val):
    """
    Returns (junior_player: bool, junior_until: str|None)
    JJ/2025 -> True, 2025-06-30
    JJ30    -> True, 2030-06-30
    1L      -> False (first licence, not junior flag)
    """
    if not jj_val:
        return False, None
    s = str(jj_val).strip().upper()
    if not s.startswith('JJ'):
        return False, None

    # Try JJ/YYYY or JJ/YY
    m = re.search(r'(\d{4})', s)
    if m:
        year = int(m.group(1))
        return True, f"{year}-06-30"

    # Try JJ + 2-digit year (e.g. JJ30 = 2030)
    m2 = re.search(r'JJ(\d{2})$', s)
    if m2:
        year = 2000 + int(m2.group(1))
        return True, f"{year}-06-30"

    # JJ with no year
    return True, None


def map_nationality(nat_code, divers_val):
    """
    FRA        -> 'France'
    ET + divers -> try to extract nationality from divers text
    FIDET      -> 'International'
    """
    nat_code = clean_str(nat_code) or ''
    divers   = clean_str(divers_val) or ''
    nat_upper = nat_code.upper().strip()

    if nat_upper in ('FRA', ' FRA'):
        return 'France'
    if nat_upper == 'FIDET':
        return 'International'

    # Foreign player — try to extract nationality from divers
    nationality_map = {
        'MAROCAIN': 'Morocco', 'MAROC': 'Morocco',
        'NEERLANDAIS': 'Netherlands', 'HOLLANDAIS': 'Netherlands',
        'ANGLAIS': 'United Kingdom', 'BRITANNIQUE': 'United Kingdom',
        'POLONAIS': 'Poland', 'POLOGNE': 'Poland',
        'AMERICAIN': 'United States', 'AMERICAN': 'United States',
        'MEXICAIN': 'Mexico', 'MEXIQUE': 'Mexico',
        'BELGE': 'Belgium', 'BELGIQUE': 'Belgium',
        'COLOMBIE': 'Colombia', 'COLOMBIEN': 'Colombia',
        'LATVIA': 'Latvia', 'LETTON': 'Latvia',
        'SUEDE': 'Sweden', 'SUEDOIS': 'Sweden',
        'CONGO': 'Congo',
        'ALGERIEN': 'Algeria', 'ALG': 'Algeria',
        'COSTARICAIN': 'Costa Rica',
        'JAMAIQUE': 'Jamaica',
        'PORTORICAIN': 'Puerto Rico',
        'IVOIRIEN': 'Ivory Coast',
        'TUNISIEN': 'Tunisia', 'TUNISIE': 'Tunisia',
        'TURC': 'Turkey', 'TURQUIE': 'Turkey',
        'ESPAGNOL': 'Spain', 'ESPAGNE': 'Spain',
        'PORTUGAIS': 'Portugal', 'PORTUGAL': 'Portugal',
        'ITALIEN': 'Italy', 'ITALIE': 'Italy',
        'ALLEMAND': 'Germany', 'ALLEMAGNE': 'Germany',
        'CANADIEN': 'Canada', 'CANADA': 'Canada',
        'AUSTRALIEN': 'Australia', 'AUSTRALIE': 'Australia',
    }
    divers_upper = divers.upper()
    for key, val in nationality_map.items():
        if key in divers_upper:
            return val

    # Check VALIDITÉ for IWBF country codes (handled separately, use divers fallback)
    return 'Other' if nat_upper == 'ET' else clean_str(nat_code) or 'Other'


def map_colour(couleur_val):
    """Translate French colour names to English."""
    if not couleur_val:
        return None
    s = str(couleur_val).strip().upper()
    colour_map = {
        'BLANCHE': 'White', 'BLANC': 'White',
        'BLEUE': 'Blue', 'BLEU': 'Blue',
        'VERTE': 'Green', 'VERT': 'Green',
        'JAUNE': 'Yellow',
        'ORANGE': 'Orange',
        'ROSE': 'Pink',
        'ROUGE': 'Red',
    }
    for key, val in colour_map.items():
        if key in s:
            return val
    return clean_str(couleur_val)


def process_row(row):
    """Convert one Excel row to a players table dict."""
    identification = clean_str(row.get('Identification'))
    if identification == '0' or identification == 'nan':
        identification = None

    classification, class_status = map_classification(row.get('Class'))
    junior_player, junior_until  = map_junior(row.get('JJ'))
    nationality = map_nationality(row.get('Nationality'), row.get('Divers'))

    # Expire date — only use if it's a real date
    expire_date = parse_date(row.get('VALIDITÉ'))

    # Notes: keep original French text, very useful for the admins
    notes_1 = clean_str(row.get('remarques'))
    notes_2 = clean_str(row.get('Divers'))

    # Handicap — keep original codes (AMP, PAR, IMC, SPI, POL, DIV, VAL)
    handicap = clean_str(row.get('Handicap'))

    colour = map_colour(row.get('Couleur'))
    gender = clean_str(row.get('Gender'))

    last_name  = (clean_str(row.get('Family Name')) or '').upper()
    first_name = (clean_str(row.get('Given Name'))  or '').upper()

    if not last_name and not first_name:
        return None  # Skip completely empty rows

    return {
        "identification": identification,
        "last_name":       last_name  or None,
        "first_name":      first_name or None,
        "birth_date":      parse_date(row.get('DOB')),
        "nationality":     nationality,
        "gender":          gender if gender in ('M', 'F') else None,
        "classification":  classification,
        "class_status":    class_status,
        "handicap":        handicap,
        "colour":          colour,
        "register_date":   parse_date(row.get('Date')),
        "expire_date":     expire_date,
        "junior_player":   junior_player,
        "junior_until":    junior_until,
        "classifier":      clean_str(row.get('Classifier')),
        "notes_1":         notes_1,
        "notes_2":         notes_2,
        "created_at":      datetime.utcnow().isoformat() + 'Z',
        "updated_at":      datetime.utcnow().isoformat() + 'Z',
    }


def insert_batch(batch):
    """Insert a batch of rows into Supabase."""
    url = f"{SUPABASE_URL}/rest/v1/players"
    resp = requests.post(url, headers=HEADERS, data=json.dumps(batch))
    return resp.status_code, resp.text


def main():
    print("=" * 60)
    print("France Classification — Excel Import")
    print("=" * 60)

    if "YOUR-PROJECT" in SUPABASE_URL or "YOUR-SERVICE" in SERVICE_ROLE_KEY:
        print("\n❌  ERROR: Set SUPABASE_URL and SERVICE_ROLE_KEY before running.\n")
        return

    print(f"\n📂  Reading: {EXCEL_FILE}")
    df = pd.read_excel(EXCEL_FILE, sheet_name='Feuil1', dtype=str)
    print(f"✅  Found {len(df)} rows\n")

    records = []
    skipped = 0
    for _, row in df.iterrows():
        rec = process_row(row.to_dict())
        if rec:
            records.append(rec)
        else:
            skipped += 1

    print(f"📋  {len(records)} records to insert ({skipped} skipped — empty rows)\n")

    # Insert in batches of 50
    batch_size = 50
    success = 0
    errors  = []

    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        status, text = insert_batch(batch)
        if status in (200, 201):
            success += len(batch)
            print(f"  ✓  Batch {i//batch_size + 1}: inserted {len(batch)} records")
        else:
            errors.append((i, status, text[:200]))
            print(f"  ✗  Batch {i//batch_size + 1} FAILED — HTTP {status}: {text[:100]}")

    print(f"\n{'=' * 60}")
    print(f"✅  Import complete: {success}/{len(records)} records inserted")
    if errors:
        print(f"⚠️   {len(errors)} batches had errors — check above for details")
    print("=" * 60)
    print("\n🔒  IMPORTANT: Revoke or delete the service_role key from this")
    print("    script after the import is done. Never leave it in a file.")


if __name__ == "__main__":
    main()
