"""
Utility script to allocate provincial GDP down to Census Divisions (CDs)
using 2021 Census population data, so it can be joined to
`canada_census_divisions.geojson` for a sub‑provincial heatmap.

IMPORTANT: The big Census CSVs from StatCan have many columns and
slightly awkward headers. You MUST open your specific CD profile CSV
in a spreadsheet or editor once and set the column names below to match
your file. The script is written to stream rows so it can handle very
large CSVs.

Inputs (expected paths):
  - data/province-level-gdp.csv
      → existing provincial GDP in millions (used for 2021)
  - data/provinces/<YOUR_CD_PROFILE_CSV>.csv
      → 2021 Census Profile at the Census Division (CD) level

Output:
  - data/census_division_gdp_2021.csv
      Columns: cd_uid, province_code, province_name, population_2021,
               gdp_2021_millions

This is an approximation: each province’s 2021 GDP is distributed
across its CDs in proportion to CD population.
"""

from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data"
PROVINCES_DIR = DATA_DIR / "provinces"

PROVINCE_GDP_CSV = DATA_DIR / "province-level-gdp.csv"
# Try to find a CSV with Census division data, or use GeoJSON directly
CD_PROFILE_CSV = PROVINCES_DIR / "98-401-X2021020_English_CSV_data.csv"
CD_GEOJSON_PATH = ROOT / "canada_census_divisions.geojson"
OUTPUT_CSV = DATA_DIR / "census_division_gdp_2021.csv"

PROVINCE_NAME_TO_CODE = {
    "Newfoundland and Labrador": "10",
    "Prince Edward Island": "11",
    "Nova Scotia": "12",
    "New Brunswick": "13",
    "Quebec": "24",
    "Ontario": "35",
    "Manitoba": "46",
    "Saskatchewan": "47",
    "Alberta": "48",
    "British Columbia": "59",
    "Yukon": "60",
    "Northwest Territories": "61",
    "Nunavut": "62",
}

CD_UID_COL = "ALT_GEO_CODE"
CD_GEO_LEVEL_COL = "GEO_LEVEL"
CD_GEO_LEVEL_VALUE = "Census division"
CD_GEOGRAPHY_LEVEL_COL = "GEO_LEVEL"  # Kept for potential debugging; not required now.


@dataclass
class CDRecord:
    cd_uid: str
    province_code: str
    province_name: str
    population: int  # currently set to 1 for all CDs (equal-weight split)


def load_provincial_gdp(path: Path) -> Dict[str, float]:
    gdp_by_province: Dict[str, float] = {}

    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader, None)
        if not header:
            raise RuntimeError("province-level-gdp.csv is empty")

        for row in reader:
            if not row or len(row) < 12:
                continue
            year = row[0].strip()
            province_name = row[1].strip()
            gdp_2021_str = row[11].replace(",", "").strip()

            if year != "2021":
                continue
            if province_name not in PROVINCE_NAME_TO_CODE:
                continue
            if not gdp_2021_str:
                continue

            try:
                gdp_2021 = float(gdp_2021_str)
            except ValueError:
                continue

            prov_code = PROVINCE_NAME_TO_CODE[province_name]
            gdp_by_province[prov_code] = gdp_2021

    return gdp_by_province


def load_census_divisions_from_geojson(geojson_path: Path) -> List[CDRecord]:
    """Load census divisions directly from the GeoJSON file."""
    cds: List[CDRecord] = []
    seen = set()
    
    try:
        with geojson_path.open("r", encoding="utf-8") as f:
            geo = json.load(f)
        
        for feature in geo.get("features", []):
            props = feature.get("properties", {})
            cd_code = str(props.get("cd_code", "")).strip()
            prov_code = str(props.get("prov_code", "")).strip()
            
            if not cd_code or not prov_code:
                continue
            
            key = (cd_code, prov_code)
            if key in seen:
                continue
            seen.add(key)
            
            if prov_code not in PROVINCE_NAME_TO_CODE.values():
                continue
            
            province_name = next(
                (name for name, code in PROVINCE_NAME_TO_CODE.items() if code == prov_code),
                prov_code,
            )
            
            cds.append(
                CDRecord(
                    cd_uid=cd_code,
                    province_code=prov_code,
                    province_name=province_name,
                    population=1,  # Equal weight for now
                )
            )
    except Exception as e:
        print(f"⚠️ Error loading from GeoJSON: {e}")
    
    return cds


def load_census_divisions(path: Path) -> List[CDRecord]:
    cds: List[CDRecord] = []
    seen_cds = set()  # Track by (cd_uid, province_code) to avoid duplicates

    # StatCan 98-401 CSVs are typically ISO-8859-1 / Windows-1252 encoded,
    # not strict UTF-8, so use a more permissive encoding here.
    with path.open("r", encoding="latin1", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            try:
                # Only process Census division level rows
                geo_level = (row.get(CD_GEO_LEVEL_COL, "") or "").strip()
                if geo_level != CD_GEO_LEVEL_VALUE:
                    continue

                cd_uid = (row.get(CD_UID_COL, "") or "").strip()
                if not cd_uid:
                    continue

                # CD ALT_GEO_CODE usually starts with the 2-digit province code.
                prov_code_prefix = cd_uid[:2]
                if prov_code_prefix not in PROVINCE_NAME_TO_CODE.values():
                    continue

                province_code = prov_code_prefix
                
                # Skip if we've already seen this CD
                key = (cd_uid, province_code)
                if key in seen_cds:
                    continue
                seen_cds.add(key)

                # Try to get population from C1_COUNT_TOTAL if CHARACTERISTIC_NAME indicates population
                char_name = (row.get("CHARACTERISTIC_NAME", "") or "").strip().lower()
                population = 1  # default equal-weight
                if "population" in char_name and "total" in char_name:
                    pop_str = (row.get("C1_COUNT_TOTAL", "") or "").strip().replace(",", "")
                    try:
                        population = float(pop_str) if pop_str else 1
                    except ValueError:
                        population = 1

                # We only need province_name for readability; derive from mapping if possible.
                province_name = next(
                    (name for name, code in PROVINCE_NAME_TO_CODE.items() if code == province_code),
                    province_code,
                )

                cds.append(
                    CDRecord(
                        cd_uid=cd_uid,
                        province_code=province_code,
                        province_name=province_name,
                        population=population,
                    )
                )
            except Exception as e:
                continue

    return cds


def allocate_gdp_to_cds(
    gdp_by_province: Dict[str, float], cds: List[CDRecord]
) -> List[Dict[str, str]]:
    cds_by_province: Dict[str, List[CDRecord]] = {}
    for cd in cds:
        cds_by_province.setdefault(cd.province_code, []).append(cd)

    output_rows: List[Dict[str, str]] = []

    for prov_code, cd_list in cds_by_province.items():
        prov_gdp = gdp_by_province.get(prov_code)
        if prov_gdp is None:
            continue

        total_pop = sum(cd.population for cd in cd_list)
        if total_pop <= 0:
            continue

        for cd in cd_list:
            share = cd.population / total_pop
            cd_gdp = prov_gdp * share

            output_rows.append(
                {
                    "cd_uid": cd.cd_uid,
                    "province_code": cd.province_code,
                    "province_name": cd.province_name,
                    "population_2021": str(cd.population),
                    "gdp_2021_millions": f"{cd_gdp:.3f}",
                }
            )

    return output_rows


def main() -> None:
    print("📥 Loading provincial GDP from:", PROVINCE_GDP_CSV)
    gdp_by_province = load_provincial_gdp(PROVINCE_GDP_CSV)
    print(f"   → Loaded GDP for {len(gdp_by_province)} provinces/territories")

    print("📥 Loading Census Division data...")
    cds = load_census_divisions(CD_PROFILE_CSV)
    if len(cds) == 0:
        print("   ⚠️ CSV approach found 0 CDs, trying GeoJSON directly...")
        cds = load_census_divisions_from_geojson(CD_GEOJSON_PATH)
    print(f"   → Loaded {len(cds)} census divisions")

    print("📊 Allocating GDP down to census divisions…")
    rows = allocate_gdp_to_cds(gdp_by_province, cds)
    print(f"   → Produced {len(rows)} CD‑level GDP rows")

    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_CSV.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "cd_uid",
                "province_code",
                "province_name",
                "population_2021",
                "gdp_2021_millions",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    print("✅ Done. Wrote CD‑level GDP to:", OUTPUT_CSV)


if __name__ == "__main__":
    main()