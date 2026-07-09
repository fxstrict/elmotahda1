#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
excel_to_json.py
----------------
يحوّل ملف Excel (.xlsx) أو CSV يحتوي على أعمدة قطع الغيار
إلى ملف data/products.json المستخدم في الموقع مباشرة.

الأعمدة المطلوبة في ملف Excel/CSV (بنفس هذه الأسماء بالضبط):
    code, name, model, brand, category, subcategory, image_filename, description

طريقة الاستخدام:
    python3 tools/excel_to_json.py path/to/products.xlsx
    python3 tools/excel_to_json.py path/to/products.csv

الناتج:
    - يتم تحديث data/products.json مباشرة.
    - تقرير في النهاية بعدد القطع المضافة، وأي أكواد ينقصها صورة حقيقية
      (تحذير فقط ولا يوقف العملية — سيتم عرض صورة placeholder تلقائياً).
"""

import sys
import os
import json
import csv

REQUIRED_COLUMNS = [
    "code", "name", "model", "brand",
    "category", "subcategory", "image_filename", "description"
]

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PRODUCTS_JSON_PATH = os.path.join(ROOT_DIR, "data", "products.json")
PRODUCTS_IMAGES_DIR = os.path.join(ROOT_DIR, "assets", "images", "products")


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        return list(reader)


def read_xlsx(path):
    try:
        import openpyxl
    except ImportError:
        print("مكتبة openpyxl غير مثبتة. ثبّتها أولاً عبر:")
        print("    pip install openpyxl --break-system-packages")
        sys.exit(1)

    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    headers = [str(h).strip() if h is not None else "" for h in rows[0]]
    records = []
    for row in rows[1:]:
        if all(cell is None for cell in row):
            continue
        record = {}
        for header, value in zip(headers, row):
            record[header] = "" if value is None else str(value).strip()
        records.append(record)
    return records


def load_existing_products():
    if os.path.exists(PRODUCTS_JSON_PATH):
        with open(PRODUCTS_JSON_PATH, encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []


def main():
    if len(sys.argv) < 2:
        print("الاستخدام: python3 tools/excel_to_json.py path/to/products.xlsx")
        sys.exit(1)

    input_path = sys.argv[1]
    if not os.path.exists(input_path):
        print(f"لم يتم العثور على الملف: {input_path}")
        sys.exit(1)

    ext = os.path.splitext(input_path)[1].lower()
    if ext == ".csv":
        rows = read_csv(input_path)
    elif ext in (".xlsx", ".xlsm"):
        rows = read_xlsx(input_path)
    else:
        print("امتداد الملف غير مدعوم. استخدم .xlsx أو .csv فقط.")
        sys.exit(1)

    missing_cols_rows = []
    new_products = []
    missing_images = []

    for i, row in enumerate(rows, start=2):  # صف 2 لأن صف 1 هو العناوين
        missing = [c for c in REQUIRED_COLUMNS if c not in row]
        if missing:
            missing_cols_rows.append((i, missing))
            continue

        code = str(row.get("code", "")).strip()
        if not code:
            continue

        image_filename = str(row.get("image_filename", "")).strip()
        image_path_rel = f"assets/images/products/{image_filename}" if image_filename else f"assets/images/products/{code}.jpg"

        # التحقق من وجود صورة حقيقية بنفس الاسم
        real_image_path = os.path.join(ROOT_DIR, image_path_rel.replace("/", os.sep))
        if not os.path.exists(real_image_path):
            missing_images.append(code)

        product = {
            "code": code,
            "name": str(row.get("name", "")).strip(),
            "model": str(row.get("model", "")).strip(),
            "brand": str(row.get("brand", "")).strip(),
            "category": str(row.get("category", "")).strip(),
            "subcategory": str(row.get("subcategory", "")).strip(),
            "image": image_path_rel,
            "description": str(row.get("description", "")).strip(),
        }
        new_products.append(product)

    if missing_cols_rows:
        print("تحذير: صفوف بها أعمدة ناقصة تم تجاهلها:")
        for row_num, missing in missing_cols_rows:
            print(f"  - الصف {row_num}: أعمدة ناقصة {missing}")

    # دمج مع المنتجات الحالية: أي كود موجود بالفعل يتم تحديثه، وأي كود جديد يُضاف
    existing = load_existing_products()
    existing_by_code = {p["code"]: p for p in existing}
    for p in new_products:
        existing_by_code[p["code"]] = p  # يحافظ على أي حقول إضافية مستقبلية غير موجودة هنا لو كانت مطابقة بالاسم

    merged = list(existing_by_code.values())

    os.makedirs(os.path.dirname(PRODUCTS_JSON_PATH), exist_ok=True)
    with open(PRODUCTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, indent=2)

    print("\n===== تقرير التحديث =====")
    print(f"عدد القطع التي تمت معالجتها من الملف: {len(new_products)}")
    print(f"إجمالي عدد القطع في products.json الآن: {len(merged)}")
    if missing_images:
        print(f"\nتحذير: {len(missing_images)} كود بلا صورة حقيقية (سيظهر لها placeholder تلقائياً):")
        for code in missing_images:
            print(f"  - {code}")
    else:
        print("\nكل الأكواد لديها صورة حقيقية مطابقة. ")
    print("==========================\n")


if __name__ == "__main__":
    main()
