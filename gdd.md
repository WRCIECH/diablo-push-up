# Diablo Pompki — Game Design Document

## Cel i idea

Aplikacja do treningu pompek gamifikowana motywem **Diablo 1**. Jedyny użytkownik to sam twórca. Gra narzuca pompki — użytkownik potwierdza sukces lub porażkę. Żadnego ręcznego logowania, żadnego backendu. Priorytet to szybkość, nie perfekcja.

Cel jest dwojaki: napędzać realny postęp fizyczny w pompkach, opakowany w uzależniającą pętlę rozgrywki w stylu Diablo (loot, levelowanie, grind).

---

## Stack technologiczny

- **Frontend:** React (Vite) — PWA, działa w przeglądarce na telefonie i desktopie
- **Backend:** Node.js + Express — minimalny serwer do odczytu/zapisu stanu gry
- **Baza danych:** pojedynczy plik `gamestate.json` na serwerze — czytelny dla człowieka, łatwy do backupu
- **Hosting:** Railway, Render lub dowolny VPS — dostęp przez URL z telefonu i desktopu
- **UI:** responsywny, inspirowany estetyką Diablo 1 (ciemna paleta, gotycki klimat) — obserwator ma skojarzyć "to wygląda jak Diablo"

---

## Nowa gra / reset

Gra obsługuje tylko **jedną aktywną postać**. Nie ma wyboru slotów zapisu.

Opcja "Nowa gra" dostępna wyłącznie z menu ustawień (nie z głównego ekranu) — wymaga **dwuetapowego potwierdzenia**: pierwszy klik pokazuje ostrzeżenie (*"Czy na pewno chcesz zresetować grę? Stracisz całą postać i postęp."*), dopiero drugi klik resetuje. Zabezpieczenie przed przypadkowym kliknięciem.

Reset usuwa `gamestate.json` i tworzy nowy — czysta karta.

---

## Główna pętla gry (Game Loop)

```
START
  └─► Wybór postaci (Warrior / Rogue)
        └─► Tristram (hub)
              ├─► Rozmowa z NPC (Cain / Griswold / Pepin)
              │     └─► Wróć do Tristram
              └─► Wejście do kościoła (Level 1)
                    └─► Nawigacja: wybór kierunku
                          ├─► fight → Obliczenia → Ekran walki
                          │     ├─► WYGRANA → Auto-loot → Nawigacja
                          │     └─► PORAŻKA → Reset potworów → Tristram → 2h kara
                          ├─► nothing → Tekst fabularny → Nawigacja
                          ├─► level → Przejście do Level X (reset poprzedniego)
                          └─► Tristram → powrót do huba
```

---

## Trzymanie stanu gry

Cały stan gry trzymany w jednym pliku `gamestate.json` na serwerze. Frontend pobiera stan przy każdym załadowaniu strony i wysyła aktualizacje po każdej akcji gracza (walka, zakup, levelup itp.).

Struktura pliku:
```json
{
  "player": { "class": "warrior", "level": 1, "exp": 0, "stats": {}, "inventory": [], "gold": 100 },
  "currentLocation": "tristram",
  "defeatedMonsters": [],
  "penaltyUntil": null,
  "history": []
}
```

`history` zawiera log każdej wykonanej pompki z timestampem — podstawa przyszłych wykresów postępu.

Struktura pojedynczego wpisu w `history`:
```json
{
  "timestamp": "2025-01-15T08:32:00Z",
  "push_up_type": "standard",
  "monster": "Zombie",
  "fight_result": "won"
}
```

---

## Interfejs

Powinien przypominać interfejs z gry Diablo 1.

---

## Klasy postaci

Na początku gry wybieramy jedną z trzech klas:

- **Warrior** — dostępny
- **Rogue** — dostępny
- **Sorcerer** — zablokowany na razie (wyszarzony)

---

## Statystyki startowe i ekwipunek początkowy

Dane bezpośrednio z Diablo 1 / Jarulf's Guide. Magic jest nieaktywne — pomijamy.

### Statystyki startowe

| Klasa | Strength | Dexterity | Vitality | Life startowe | Bonus za level |
|-------|----------|-----------|----------|---------------|----------------|
| Warrior | 30 | 20 | 25 | 70 | +2 life per level |
| Rogue | 20 | 30 | 20 | 45 | +2 life per level |

### Maksymalne wartości statystyk

| Klasa | Max Strength | Max Dexterity | Max Vitality | Max Life |
|-------|-------------|--------------|--------------|----------|
| Warrior | 250 | 60 | 100 | 316 |
| Rogue | 55 | 250 | 80 | 201 |

Za każdy zdobyty level: **+5 punktów** do dowolnych statystyk.

### Ekwipunek startowy (z Diablo 1 / Jarulf's Guide)

| Klasa | Broń | Dodatkowe | Złoto | Mikstury |
|-------|------|-----------|-------|----------|
| Warrior | Short Sword (dmg 2–6) + Club + Buckler (AC 3) | — | 100 | 2x Healing Potion |
| Rogue | Short Bow (dmg 1–4) | — | 100 | 2x Healing Potion |

**Statystyki startowego ekwipunku (z Diablo 1):**

| Item | AC / Damage | Durability | Wymagania |
|------|-------------|------------|-----------|
| Short Sword | 2–6 dmg | 24 | 18 Str |
| Club | 1–6 dmg | 20 | brak |
| Buckler (tarcza) | AC 3 | 20 | brak |
| Short Bow | 1–4 dmg | 30 | 25 Str, 30 Dex |

**Startowy AC gracza (wzór z Diablo 1):**
`AC = Dex / 5 + ACitems`

- Warrior startowy AC: `20/5 + 3 (Buckler)` = **7**
- Rogue startowy AC: `30/5 + 0` = **6**

**Startowy To Hit% gracza (wzór z Diablo 1):**
`To Hit% = 50 + Dex/2 + ToHititems + clvl`

- Warrior (level 1): `50 + 10 + 0 + 1` = **61%**
- Rogue (level 1): `50 + 15 + 0 + 1` = **66%**

### Różnice między klasami (poza statystykami)

| Cecha | Warrior | Rogue |
|-------|---------|-------|
| Broń startowa | Short Sword + Club (melee) | Short Bow (ranged) |
| Tarcza startowa | Buckler (AC +3) | brak |
| Specjalna umiejętność (D1) | Repair items | Disarm traps |
| Styl walki | Siła / zwarcie | Zręczność / dystans |
| Silna statystyka | Strength | Dexterity |

> **Uwaga implementacyjna:** Umiejętności specjalne (repair, disarm traps) nie mają bezpośredniego przełożenia na pompki. Można je zignorować w MVP lub zaadaptować jako bonusy fabularne.

---

## Levele postaci i progi EXP

Wzorowane na Diablo 1. Maksymalny poziom: **20 (MVP)**. EXP za kill to stała wartość zdefiniowana per potwór w JSON (`exp`). Nie ma mnożnika opartego o poziomy — uproszczenie względem Diablo 1.

| Level | EXP do następnego levelu |
|-------|--------------------------|
| 1 | 2 000 |
| 2 | 4 620 |
| 3 | 6 440 |
| 4 | 8 360 |
| 5 | 10 700 |
| 6 | 13 600 |
| 7 | 17 100 |
| 8 | 21 400 |
| 9 | 26 800 |
| 10 | 33 400 |
| 11 | 41 600 |
| 12 | 51 800 |
| 13 | 64 200 |
| 14 | 79 400 |
| 15 | 98 200 |
| 16 | 121 000 |
| 17 | 149 000 |
| 18 | 183 600 |
| 19 | 225 600 |
| 20 | — (max MVP) |

---

## Lokacje

Dwie główne lokacje: **Tristram** i **Level 1**. Generowane na podstawie plików JSON.

### Definicja lokacji (JSON)

```json
{
  "type": "dungeon3",
  "places": []
}
```

**type:**
- `"dungeon3"` — drzewko 3ⁿ lokacji
- `"plain"` — wszystkie lokacje dostępne od razu

### Definicja `places`

```json
{
  "type": "fight",
  "details": "skeleton",
  "cryptic": true
}
```

| Pole | Wartości |
|------|----------|
| `type` | `"npc"` / `"fight"` / `"level"` / `"nothing"` (`"chest"` pominięty w MVP) |
| `details` | Szczegóły (nazwa potwora, NPC itp.) |
| `cryptic` | `true` = zawartość ukryta; `false` = widoczna |

### Pierwsze wejście do dungeonu

Przy pierwszym wejściu do Level 1 (i każdym kolejnym po resecie) gracz widzi klimatyczny tekst wprowadzający — generowany przez AI w stylu Diablo, np.:

> *"Wchodzisz do mrocznych katakumb katedry. Powietrze jest ciężkie od pleśni i gnijącego mięsa. Przed tobą rozciągają się trzy korytarze."*

Po tekście natychmiast pojawia się lista kierunków do wyboru.

### Nawigacja — co gracz widzi

Gracz zawsze widzi listę dostępnych kierunków. Przykład:

```
Gdzie idziemy?
1. Powrót do poprzedniej lokacji
2. Po lewej widzisz szkielet przed sobą. Idź go zaatakować   ← cryptic: false
3. Widzisz zaciemniony teren z przodu i ryzykujesz pójście tam ← cryptic: true
```

Dla `type: "nothing"`:
- `cryptic: false` → "Idziesz do miejsca, w którym nic nie ma"
- `cryptic: true` → po wejściu: "Weszłeś na teren, na którym nic nie ma"

### Przejście między levelami (`type: "level"`)

Gra pyta: *"Czy chcesz przejść do Level X?"*. Po potwierdzeniu gracz przechodzi. Powrót do poprzedniego levelu resetuje potwory na nim — umożliwia grindowanie.

---

## NPC

### Deckard Cain
Stoi przy studni. Identyfikuje **magiczne i unikalne** przedmioty za **100 złota per item** (z Diablo 1). Normalne itemy są identyfikowane automatycznie. Jeśli gracz nie ma 100 złota — Cain odmawia. Dostarcza lore i questy. *"Stay a while and listen."*

### Griswold
Kupuje i sprzedaje broń, zbroje, hełmy, tarcze. Naprawia ekwipunek (durability nieaktywne w MVP — naprawa niedostępna).

**Mechanika sklepu (z Diablo 1):** Griswold oferuje 10–19 normalnych itemów oraz 6 magicznych, losowanych przy każdej wizycie w mieście. Asortyment zmienia się gdy gracz wchodzi głębiej do dungeonu.

**Ceny bazowe wybranych itemów (z Diablo 1 / Jarulf's Guide):**
| Item | Cena kupna | Cena sprzedaży (1/4) |
|------|-----------|----------------------|
| Short Sword | 120 złota | 30 złota |
| Club | 20 złota | 5 złota |
| Buckler | 50 złota | 12 złota |
| Short Bow | 100 złota | 25 złota |
| Cap (hełm) | 15 złota | 3 złota |
| Rags (zbroja) | 5 złota | 1 złoto |
| Quilted Armor | 45 złota | 11 złota |

Magiczne itemy kosztują więcej — cena zależna od prefiksów/sufiksów (formuły w Jarulf's Guide sekcja 3.6). W MVP można uprościć do: cena bazowa × mnożnik losowy (2–10×) dla magicznych itemów.

**Identyfikacja przez Caina:** 100 złota za item. Jeśli gracz nie ma 100 złota, Cain odmawia z komunikatem w stylu Diablo (*"Nie mam czasu na bezpłatne usługi, wędrowcze."*).

### Pepin
Leczy bezpłatnie (rozmowa = pełne HP). Sprzedaje healing potions w nielimitowanych ilościach.

**Ceny (z Diablo 1):**
| Item | Cena kupna | Cena sprzedaży |
|------|-----------|----------------|
| Healing Potion (partial) | 50 złota | 12 złota |
| Healing Potion (full) | 150 złota | 37 złota |

---

## Potwory na Level 1

W Diablo 1 na Level 1 zawsze można spotkać: **Fallen One, Skeleton, Zombie.**
Statystyki z Diablo 1 (Normal difficulty, Single Player).

Pole `push_up_types` definiuje pulę pompek z której losowane są wymagane powtórzenia. Potwory na Level 1 mają tylko łatwe typy — gracz dopiero zaczyna.

### Zombie (Undead)
| Wariant | dlvl | HP (D1) | AC | To Hit% | Damage | EXP |
|---------|------|---------|-----|---------|--------|-----|
| Zombie | 1–2 | 4–7 | 5 | 10 | 2–5 | 54 |
| Ghoul | 2–3 | 7–11 | 10 | 10 | 3–10 | 58 |

Zombie to powolny, wytrzymały przeciwnik — dużo pompek, dużo czasu. Typ pompek: podstawowe.

```json
{
  "name": "Zombie",
  "vitality": 5, "damage": 2, "ac": 5, "toHit": 10, "exp": 54, "gold_drop": [1, 16],
  "push_up_types": ["standard", "standard", "standard", "knee", "incline"]
}
```
```json
{
  "name": "Ghoul",
  "vitality": 9, "damage": 6, "ac": 10, "toHit": 10, "exp": 58, "gold_drop": [1, 20],
  "push_up_types": ["standard", "standard", "wide", "incline", "standard"]
}
```

### Fallen One (Animals)
| Wariant | dlvl | HP (D1) | AC | To Hit% | Damage | EXP |
|---------|------|---------|-----|---------|--------|-----|
| Fallen One (spear) | 1–3 | 1–4 | 0 | 15 | 1–3 | 46 |
| Fallen One (sword) | 1–3 | 2–5 | 10 | 15 | 1–4 | 52 |

Fallen One to słaby, szybki przeciwnik — mało pompek, mało czasu. Typ pompek: bardzo łatwe.

```json
{
  "name": "Fallen One (spear)",
  "vitality": 2, "damage": 2, "ac": 0, "toHit": 15, "exp": 46, "gold_drop": [1, 10],
  "push_up_types": ["knee", "incline", "knee"]
}
```
```json
{
  "name": "Fallen One (sword)",
  "vitality": 3, "damage": 3, "ac": 10, "toHit": 15, "exp": 52, "gold_drop": [1, 10],
  "push_up_types": ["knee", "standard", "incline"]
}
```

### Skeleton (Undead)
| Wariant | dlvl | HP (D1) | AC | To Hit% | Damage | EXP |
|---------|------|---------|-----|---------|--------|-----|
| Skeleton | 1–2 | 2–4 | 0 | 20 | 1–4 | 64 |

Skeleton to szybki, agresywny przeciwnik z niskim życiem ale wysokim To Hit — mało pompek, ale potwór często trafia (redukuje czas). Typ pompek: łatwe-średnie.

```json
{
  "name": "Skeleton",
  "vitality": 3, "damage": 2, "ac": 0, "toHit": 20, "exp": 64, "gold_drop": [1, 14],
  "push_up_types": ["standard", "incline", "standard"]
}
```

> **Uwaga implementacyjna — semantyka `push_up_types`:**
> To pole to **weighted pool (pula ważona)** wyrażona przez powtórzenia — NIE jest to gotowa sekwencja pompek do wykonania w tej kolejności.
> Każde wystąpienie nazwy w liście = jeden "los" w losowaniu. Im więcej powtórzeń danego typu, tym wyższe prawdopodobieństwo jego wylosowania.
> Silnik losuje z tej puli `round(vitality * PUSH_UP_RATIO)` razy **niezależnie z powtórzeniami** — wynikiem jest konkretna lista pompek na daną walkę.
> Przykład: Zombie ma `["standard","standard","standard","knee","incline"]` → szansa 3/5 (60%) na standard, 1/5 (20%) na knee, 1/5 (20%) na incline przy każdym pojedynczym losowaniu. Wylosowane 4 pompki mogą dać np. `[standard, standard, knee, standard]`.

---

## Stałe wymagające kalibracji

Poniższe stałe muszą być zdefiniowane w kodzie przed pierwszymi playtestami. Każda ma identyfikator do użycia w kodzie.

```
PUSH_UP_RATIO           // ile HP potwora (D1) = 1 pompka
                        // np. jeśli = 0.5, to Zombie (HP 4-7) = 2-4 pompki
                        // sugerowany zakres startowy: 0.3 – 1.0

DAMAGE_TO_SECONDS       // ile sekund czasu podstawowego odejmuje 1 punkt Damage potwora
                        // np. jeśli = 3, to Zombie Damage 2-5 = odejmuje 6-15 sek
                        // sugerowany zakres startowy: 2 – 5

BASE_FIGHT_TIME         // bazowy czas walki w sekundach PRZED redukcją przez Damage
                        // np. 120 sek (2 minuty) dla potwora z Level 1
                        // sugerowany zakres startowy: 60 – 180

VITALITY_TO_SECONDS     // ile sekund buforu czasu daje 1 punkt Vitality
                        // np. jeśli = 2, startowe Vit=25 daje 50 sek buforu
                        // sugerowany zakres startowy: 1 – 3

DEX_HIT_CHANCE          // formuła: szansa na pominięcie pompki (Rzut 1)
                        // wzorowane na D1: (player.ToHit% - monster.AC) / 2
                        // gdzie player.ToHit% = 50 + Dex/2 + clvl
                        // wynik clampowany do [5%, 95%]

MONSTER_HIT_CHANCE      // formuła: szansa że potwór redukuje czas (Rzut 3)
                        // wzorowane na D1: (monster.ToHit% - player.AC) / 2
                        // wynik clampowany do [5%, 95%]

HEALING_POTION_SECONDS  // ile sekund do puli podstawowej dodaje jedna healing potion
                        // sugerowany zakres: 20 – 60

```

---

## Mechanika walki

### Zasada nadrzędna

Wszystkie obliczenia wykonywane są **przed** walką. Gracz widzi upfront:
- Ile pompek i jakiego typu (może być mix; kolejność wykonania — **dowolna**)
- Czas podstawowy
- Bufor czasu (Vitality)

### Walka z kilkoma potworami

**MVP:** walka tylko z jednym potworem na raz. Mechanika wielu potworów — do rozważenia w przyszłości.

### Pętla obliczeniowa — kolejność operacji

Operacje wykonywane są w tej kolejności: najpierw Strength redukuje trudność pompek, dopiero potem Dexterity może je pominąć. Dzięki temu gracz maksymalizuje benefit z siły zanim losowość dexterity wejdzie w grę.

**Krok 1 — Pula redukcji siły (deterministyczny)**

```
reduction_pool = player.Strength + equipped_weapon.damage

// Generujemy pełną pulę pompek z monster.push_up_types
pula = losuj(monster.push_up_types, round(monster.vitality * PUSH_UP_RATIO))

// Sortujemy od najtrudniejszej i redukujemy difficulty
FOR EACH pompka w puli [posortowane od max difficulty]:
  points_to_reduce = pompka.difficulty - 1  // min difficulty = 1 (Knee push-up)
  actual_reduction = min(points_to_reduce, reduction_pool)
  pompka.difficulty -= actual_reduction
  reduction_pool -= actual_reduction
  IF reduction_pool == 0: STOP
```

**Krok 2 — Dexterity skip (losowy, per pompka)**

```
DLA KAŻDEJ pompki w puli (po redukcji siły):

  RZUT 1 — Czy pompka jest wymagana?
    chance = clamp((player.ToHit% - monster.AC) / 2, 5%, 95%)
    // player.ToHit% = 50 + Dex/2 + clvl
      → sukces: pompka POMINIĘTA
      → porażka: pompka WYMAGANA (trafia na finalną listę)
```

**Krok 3 — Atak potwora (losowy, per pompka z oryginalnej puli)**

```
DLA KAŻDEJ pompki z oryginalnej puli (PRZED filtrem Dexterity):

  RZUT 3 — Czy potwór redukuje czas?
    chance = clamp((monster.ToHit% - player.AC) / 2, 5%, 95%)
    // player.AC = Dex/5 + ACitems
      → sukces: czas_podstawowy -= monster.Damage * DAMAGE_TO_SECONDS
      → porażka: czas bez zmian
```

> Potwór atakuje niezależnie od tego czy bohater pompkę wykonał czy pominął (Dexterity skip). Symetria z Diablo 1: bohater i potwór "wymieniają ciosy" przy każdej pompce z puli, każdy ze swoim % szans trafienia.

**Wynik prezentowany graczowi przed walką:**
```
  - Finalna lista pompek (typ + liczba, kolejność dowolna)
  - Czas podstawowy po redukcjach (min. 0)
  - Bufor czasu = player.Vitality * VITALITY_TO_SECONDS
```

### System czasu

| Pula | Źródło | Opis |
|------|--------|------|
| **Czas podstawowy** | `BASE_FIGHT_TIME` - redukcje z Rzutu 3 | Główne okno |
| **Bufor czasu** | `player.Vitality * VITALITY_TO_SECONDS` | Aktywuje się gdy czas podstawowy = 0 |

- **Healing potion** (real-time, w trakcie walki): dodaje `HEALING_POTION_SECONDS` do czasu podstawowego
- Czas podstawowy ma podłogę na poziomie **0** — nie może być ujemny. Jeśli redukcje z Rzutu 3 zejdą poniżej 0, czas podstawowy = 0 i gracz wchodzi do walki wyłącznie z buforem Vitality
- Gdy bufor = 0 → **przegrana**

### Reset potworów
Wygrana czyści potwora z mapy (bieżący level). Reset po ponownym wejściu z Tristram.

---

## Ekrany aplikacji

1. **Ekran startowy / wybór postaci** — wybór Warrior lub Rogue (Sorcerer wyszarzony)
2. **Tristram (hub)** — lista NPC do odwiedzenia + przycisk wejścia do kościoła; licznik kary 2h jeśli aktywna
3. **Ekran NPC** — dialog/opcje dla Caina, Griswolda, Pepina
4. **Nawigacja w dungeonie** — lista kierunków (cryptic/non-cryptic)
5. **Ekran walki** — lista pompek + licznik czasu + przyciski akcji
6. **Ekran looту** — co wypadło po walce (auto-loot, ale pokazujemy graczowi co dostał)
7. **Ekran postaci** — wzorowany na Diablo 1, zoptymalizowany pod smartfon:
   - Statystyki: Str / Dex / Vit / Level / EXP (pasek postępu do następnego levelu)
   - Paperdoll: uproszczony schemat postaci z slotami (weapon, armor, helm, shield)
   - Statystyki pompkowe: "Wykonano X pompek łącznie" / "Czas spędzony na pompkach: Yh Zm"
   - Plecak: lista niezałożonych itemów z opcją wyposażenia lub sprzedaży
8. **Ekran sklepu** — lista itemów u Griswolda lub Pepina, możliwość kupna/sprzedaży

---

## Ekran walki — co gracz widzi

Przed walką (po obliczeniach) gracz widzi:
- Nazwę i "portret" potwora (klimat Diablo)
- Listę pompek do wykonania (typ + liczba, kolejność dowolna)
- Czas podstawowy (np. "120 sek")
- Bufor czasu z Vitality (np. "+ 50 sek buforu")

W trakcie walki:
- Odliczający licznik czasu (czas podstawowy → potem bufor, wizualnie odróżnione)
- Przycisk "Wypiłem healing potion" (dodaje `HEALING_POTION_SECONDS` do czasu podstawowego)
- Po zakończeniu: przycisk **"Wygrałem"** lub **"Przegrałem"** — gracz sam raportuje wynik (honor system)

Ogólna estetyka: ciemna, gotycka paleta kolorów, czcionka i elementy UI kojarzące się z Diablo 1.

## Faza wykonania

Gracz fizycznie wykonuje pompki. Forma wykonania — jego odpowiedzialność.

- Pompki można wykonywać w **dowolnej kolejności**
- Healing potion można wypić w dowolnym momencie (przycisk w UI)
- **Wynik** (raportowany przez gracza):
  - Wykonał wszystkie pompki w czasie → **Wygrana** → loot + EXP
  - Czas się skończył → **Porażka** → reset potworów, powrót do Tristram, **2h kara**

**Kara 2h:** gracz może chodzić po Tristram i robić zakupy, ale wejście do lochów jest zablokowane. UI pokazuje licznik: *"Możesz wrócić do lochów za: 1h 23min"*

---

## System lootowania

### Mechanika dropu (per potwór, wzorowane na Diablo 1)

| Wynik rzutu | Co wypada |
|-------------|-----------|
| ~40% | Nic |
| ~30% | Złoto (zakres z `monster.gold_drop`) |
| ~20% | Normalny item |
| ~7% | Magiczny item (z prefiksem/sufiksem) |
| ~3% | Unikat |

### Auto-loot i ekwipunek

Item który wypada jest **automatycznie dodawany do ekwipunku** (auto-loot). Brak animacji "podnoszenia z ziemi" — item pojawia się od razu na liście po zakończeniu walki.

Ekwipunek to **prosta lista bez limitu slotów** w MVP. Gracz widzi wszystkie posiadane itemy. Może:
- **Wyposażyć** item (zastępuje aktualnie wyposażony w danym slocie)
- **Sprzedać** item u Griswolda za złoto

Sloty ekwipunku: `weapon` (1 aktywna broń), `armor` (1 zbroja), `helm` (1 hełm), `shield` (1 tarcza). Reszta itemów w plecaku (lista bez limitu).

### Jakość itemów

- **Normalne** — brak prefiksu/sufiksu, automatycznie zidentyfikowane
- **Magiczne** — 1 prefix i/lub 1 suffix, wymagają identyfikacji przez Caina (100 złota)
- **Unikalne** — predefiniowane, rzadkie, wymagają identyfikacji przez Caina (100 złota)

### Przykładowe prefiksy i sufiksy (z Diablo 1)

**Prefiksy broni:** *Tin* (+1–2 dmg), *Steel* (+2–4 dmg), *Iron* (+3–6 dmg), *Warrior's* (+200% dmg)

**Sufiksy broni:** *of Slaying* (+20% dmg), *of the Bear* (+5–10 Str), *of Accuracy* (+5–10% To Hit)

**Prefiksy zbroi:** *Leather* (+1–5 AC), *Hard* (+5–10 AC), *Fortified* (+15–20 AC)

**Sufiksy zbroi:** *of the Fox* (+1–5 Dex), *of Vim* (+1–5 Vit), *of Health* (+10–20 Life)

> Pełna lista: https://diablo.noktis.pl/en/affixes i Jarulf's Guide sekcja 3.4

---

## Pompki

```json
[
  { "name": "Knee push-up", "difficulty": 1,
    "definition": "Knees on floor, straight line knees-to-shoulders. Chest close to floor, full arm extension. Hips don't sag." },
  { "name": "Incline push-up", "difficulty": 2,
    "definition": "Hands on elevated surface. Straight body line. Chest to edge, full extension at top." },
  { "name": "Standard push-up", "difficulty": 3,
    "definition": "Plank, hands shoulder-width. Chest touches floor, elbows 45–90°. Full arm extension. Hips level." },
  { "name": "Wide push-up", "difficulty": 4,
    "definition": "Hands wider than shoulders. Chest touches floor. Full extension at top." },
  { "name": "Decline push-up", "difficulty": 5,
    "definition": "Feet elevated. Straight body. Chest near floor, full extension. Harder with higher feet." },
  { "name": "Close-grip push-up", "difficulty": 5,
    "definition": "Hands under sternum, elbows close to body. Chest to hands, full extension." },
  { "name": "Diamond push-up", "difficulty": 6,
    "definition": "Thumbs and index fingers form diamond. Sternum to hands, full extension." },
  { "name": "T push-up", "difficulty": 6,
    "definition": "After push-up, rotate torso, one arm to ceiling (T shape). Alternate sides. Hips level." },
  { "name": "Archer push-up", "difficulty": 7,
    "definition": "Wide hands. Weight shifts to one arm, other extends sideways. Chest to working arm. Alternate." },
  { "name": "Clap push-up", "difficulty": 7,
    "definition": "Explosive push, hands leave floor, clap in air, soft landing." }
]
```

---

## Itemy i ekwipunek

### Pieniądze
Waluta. Wydawana u NPC. Można sprzedawać itemy.

### Bronie
Zwiększają `weapon.damage` → wchodzi do puli redukcji siły → obniża difficulty pompek przed walką.

Do puli redukcji liczy się damage **aktywnie wyposażonej broni** (jeden slot broni aktywnej). Warrior startuje z Short Sword w ręku — Club jest w plecaku jako zapasowa i nie liczy się do puli dopóki nie zostanie wyposażona.

`reduction_pool = player.Strength + equipped_weapon.damage`

### Pancerze
Zwiększają AC gracza → chronią czas podstawowy (Rzut 3, formuła `MONSTER_HIT_CHANCE`).

### Biżuteria
Nieobsługiwana w MVP.

### Durability
Nieobsługiwana w MVP — itemy się nie zużywają i nie wymagają naprawy.

---

## Mikstury

| Typ | Efekt |
|-----|-------|
| Healing potion | +`HEALING_POTION_SECONDS` do czasu podstawowego |
| Mana potion | Nieaktywna w MVP |

Kupowane u Pepina lub lootowane z potworów.

---

## Dane historyczne

Każda pompka zapisywana z: timestamp, typ pompki, kontekst walki (potwór, level, wynik).
Umożliwia: wykresy dzień po dniu, rozkład typów, postęp w czasie.

---

## Otwarte pytania / wymagane decyzje przed implementacją

1. **Wartości 8 stałych kalibracyjnych** — do ustalenia podczas playtestów (patrz sekcja "Stałe wymagające kalibracji"). Claude Code powinien zakodować je jako konfigurowalne stałe z sugerowanymi wartościami startowymi z dokumentu.
2. **Czy Warrior i Rogue mają inne wartości stałych kalibracyjnych** (np. inny `VITALITY_TO_SECONDS`) — na razie zakładamy identyczne wartości dla obu klas, różnią się tylko statystykami startowymi i ekwipunkiem.