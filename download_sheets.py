#!/usr/bin/env python3
"""
Download Google Sheets als Excel-Datei für automatische Updates.
Verwendet Google Service Account Credentials.
"""

import os
import json
import gspread
from oauth2client.service_account import ServiceAccountCredentials

def download_google_sheets():
    """Download Google Sheets und speichere als Excel-Datei."""
    
    # Google Sheets ID aus Environment Variable
    sheets_id = os.environ.get('GOOGLE_SHEETS_ID')
    if not sheets_id:
        raise ValueError("GOOGLE_SHEETS_ID environment variable not set")
    
    # Service Account JSON aus Environment Variable
    service_account_json = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON')
    if not service_account_json:
        raise ValueError("GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set")
    
    # Parse Service Account Credentials
    credentials_dict = json.loads(service_account_json)
    
    # Setup Google Sheets API
    scope = [
        'https://spreadsheets.google.com/feeds',
        'https://www.googleapis.com/auth/drive'
    ]
    credentials = ServiceAccountCredentials.from_json_keyfile_dict(
        credentials_dict, scope
    )
    client = gspread.authorize(credentials)
    
    # Öffne Spreadsheet
    print(f"Opening Google Sheets: {sheets_id}")
    spreadsheet = client.open_by_key(sheets_id)
    
    # Export als Excel
    output_path = 'S4LeagueAutomatisierung.xlsx'
    print(f"Exporting to: {output_path}")
    
    # Hinweis: gspread unterstützt keinen direkten Excel-Export
    # Alternative: Verwende Google Drive API oder lade als CSV und konvertiere
    # Für dieses Beispiel verwenden wir einen Workaround mit pandas
    
    import pandas as pd
    from io import BytesIO
    
    # Erstelle Excel Writer
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # Exportiere jedes Sheet
        for worksheet in spreadsheet.worksheets():
            sheet_name = worksheet.title
            print(f"  Exporting sheet: {sheet_name}")
            
            # Hole alle Werte
            data = worksheet.get_all_values()
            if not data:
                continue
            
            # Konvertiere zu DataFrame
            df = pd.DataFrame(data[1:], columns=data[0])
            
            # Schreibe zu Excel
            df.to_excel(writer, sheet_name=sheet_name, index=False)
    
    print(f"✓ Successfully exported to {output_path}")

if __name__ == '__main__':
    download_google_sheets()
