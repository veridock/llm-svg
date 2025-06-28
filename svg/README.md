## 🔥 Funkcje pobierania:

1. **Kliknij przycisk** → automatycznie pobiera plik `llm.pwa.svg`
2. **Pełny standalone** → zawiera wszystko wbudowane  
3. **Gotowy do uruchomienia** → otwórz pobrany plik w przeglądarce
4. **PWA auto-setup** → manifest i service worker gotowe

## 📋 Instrukcje użycia:

**Krok 1: Pobierz**
- Kliknij przycisk "💾 Pobierz" w prawym górnym rogu
- Plik zostanie zapisany jako `llm.pwa.svg`

**Krok 2: Uruchom**
- Przejdź do folderu Downloads
- Kliknij dwukrotnie na `llm.pwa.svg` LUB
- Prawym przyciskiem → "Otwórz za pomocą" → wybierz przeglądarkę

**Krok 3: PWA (opcjonalne)**
- W przeglądarce: Menu (⋮) → "Zainstaluj aplikację" 
- Lub "Dodaj do ekranu głównego" na mobile

## 🛠️ Skrypt bash do szybkiego uruchomienia:

```bash
#!/bin/bash
# save as: run-llm-pwa.sh

echo "🚀 LLM PWA SVG Launcher"
echo "======================="

# Sprawdź czy plik istnieje
if [ ! -f "llm.pwa.svg" ]; then
    echo "❌ Nie znaleziono llm.pwa.svg"
    echo "💡 Pobierz go najpierw przyciskiem '💾 Pobierz'"
    exit 1
fi

# Wykryj system i otwórz w przeglądarce
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open llm.pwa.svg
elif [[ "$OSTYPE" == "darwin"* ]]; then
    open llm.pwa.svg  
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    start llm.pwa.svg
else
    echo "🌐 Otwórz llm.pwa.svg w przeglądarce"
fi

echo "✅ Uruchomiono LLM PWA!"
```

## 🔧 Skrypt Python (alternatywa):

```python
#!/usr/bin/env python3
# save as: run-llm-pwa.py

import os
import webbrowser
import http.server
import socketserver
from pathlib import Path

def main():
    print("🚀 LLM PWA SVG Server")
    print("====================")
    
    svg_file = "llm.pwa.svg"
    
    if not Path(svg_file).exists():
        print(f"❌ Nie znaleziono {svg_file}")
        print("💡 Pobierz go najpierw przyciskiem '💾 Pobierz'")
        return
    
    # Uruchom lokalny serwer
    PORT = 8000
    Handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            print(f"🌐 Serwer uruchomiony na http://localhost:{PORT}")
            print(f"📂 Otwórz: http://localhost:{PORT}/{svg_file}")
            
            # Otwórz w przeglądarce
            webbrowser.open(f"http://localhost:{PORT}/{svg_file}")
            
            print("🛑 Naciśnij Ctrl+C aby zatrzymać")
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n✅ Serwer zatrzymany")

if __name__ == "__main__":
    main()
```

