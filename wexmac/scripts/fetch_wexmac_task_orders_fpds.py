#!/usr/bin/env python3
"""
Fetch WEXMAC TITUS task orders from FPDS via the ATOM feed.

Queries REF_IDV_PIID for each WEXMAC IDV (N00023-25-D-*) to find
delivery orders and task orders issued against the contract vehicle.

No date filter applied - returns ALL task orders under each IDV.
The IDVs themselves were signed Dec 2024 / early 2025, so all
results are recent by definition.

Usage:
    python scripts/fetch_wexmac_task_orders_fpds.py
    python scripts/fetch_wexmac_task_orders_fpds.py --resume
"""

import json
import time
import asyncio
import sys
from pathlib import Path
from datetime import datetime, timezone

from fpds import fpdsRequest

# --- Config ---
REQUEST_DELAY = 1.0  # seconds between FPDS ATOM queries (conservative)
PROJECT_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = PROJECT_DIR / "data" / "raw" / "fpds"


def save_api_response(source, params, data):
    """Save raw API response with provenance metadata."""
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ts = int(time.time())
    filename = f"{source}_{ts}.json"
    payload = {
        "source": source,
        "query_params": params,
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "record_count": len(data) if isinstance(data, list) else 1,
        "data": data,
    }
    path = RAW_DIR / filename
    with open(path, "w") as f:
        json.dump(payload, f, indent=2, default=str)
    return path




def extract_fields(record):
    """Extract key fields from a verbose FPDS ATOM record into a flat dict."""
    def get(key):
        return record.get(key, "")

    # Detect award vs IDV structure
    prefix = "content__award__" if "content__award__awardID__awardContractID__PIID" in record else "content__IDV__"
    is_award = prefix == "content__award__"

    if is_award:
        piid = get("content__award__awardID__awardContractID__PIID")
        ref_idv_piid = get("content__award__awardID__referencedIDVID__PIID")
        mod_number = get("content__award__awardID__awardContractID__modNumber")
        obligated = get("content__award__dollarValues__obligatedAmount")
        total_obligated = get("content__award__totalDollarValues__totalObligatedAmount")
        base_and_options = get("content__award__dollarValues__baseAndAllOptionsValue")
        description = get("content__award__contractData__descriptionOfContractRequirement")
        action_type = get("content__award__contractData__contractActionType")
        action_type_desc = get("content__award__contractData__contractActionType__description")
        signed_date = get("content__award__relevantContractDates__signedDate")
        effective_date = get("content__award__relevantContractDates__effectiveDate")
        completion_date = get("content__award__relevantContractDates__currentCompletionDate")
        ultimate_completion = get("content__award__relevantContractDates__ultimateCompletionDate")
        naics = get("content__award__productOrServiceInformation__principalNAICSCode")
        naics_desc = get("content__award__productOrServiceInformation__principalNAICSCode__description")
        psc = get("content__award__productOrServiceInformation__productOrServiceCode")
        psc_desc = get("content__award__productOrServiceInformation__productOrServiceCode__description")
        vendor_name = get("content__award__vendor__vendorHeader__vendorName")
        uei = get("content__award__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__UEI")
        parent_uei = get("content__award__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__ultimateParentUEI")
        parent_name = get("content__award__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__ultimateParentUEIName")
        cage_code = get("content__award__vendor__vendorSiteDetails__entityIdentifiers__cageCode")
        vendor_city = get("content__award__vendor__vendorSiteDetails__vendorLocation__city")
        vendor_state = get("content__award__vendor__vendorSiteDetails__vendorLocation__state")
        vendor_zip = get("content__award__vendor__vendorSiteDetails__vendorLocation__ZIPCode")
        vendor_country = get("content__award__vendor__vendorSiteDetails__vendorLocation__countryCode")
        contracting_agency = get("content__award__purchaserInformation__contractingOfficeAgencyID__name")
        contracting_office = get("content__award__purchaserInformation__contractingOfficeID__name")
        funding_agency = get("content__award__purchaserInformation__fundingRequestingAgencyID__name")
        funding_office = get("content__award__purchaserInformation__fundingRequestingOfficeID__name")
        pop_city = get("content__award__placeOfPerformance__principalPlaceOfPerformance__locationCode__city")
        pop_state = get("content__award__placeOfPerformance__principalPlaceOfPerformance__stateCode")
        pop_country = get("content__award__placeOfPerformance__principalPlaceOfPerformance__countryCode")
        contract_pricing = get("content__award__contractData__typeOfContractPricing__description")
        extent_competed = get("content__award__competition__extentCompeted__description")
        set_aside = get("content__award__competition__idvTypeOfSetAside__description")
        small_biz = get("content__award__vendor__contractingOfficerBusinessSizeDetermination__description")
    else:
        piid = get("content__IDV__contractID__IDVID__PIID")
        ref_idv_piid = ""
        mod_number = get("content__IDV__contractID__IDVID__modNumber")
        obligated = get("content__IDV__dollarValues__obligatedAmount")
        total_obligated = get("content__IDV__totalDollarValues__totalObligatedAmount")
        base_and_options = get("content__IDV__dollarValues__baseAndAllOptionsValue")
        description = get("content__IDV__contractData__descriptionOfContractRequirement")
        action_type = get("content__IDV__contractData__contractActionType")
        action_type_desc = get("content__IDV__contractData__contractActionType__description")
        signed_date = get("content__IDV__relevantContractDates__signedDate")
        effective_date = get("content__IDV__relevantContractDates__effectiveDate")
        completion_date = ""
        ultimate_completion = get("content__IDV__relevantContractDates__lastDateToOrder")
        naics = get("content__IDV__productOrServiceInformation__principalNAICSCode")
        naics_desc = get("content__IDV__productOrServiceInformation__principalNAICSCode__description")
        psc = get("content__IDV__productOrServiceInformation__productOrServiceCode")
        psc_desc = get("content__IDV__productOrServiceInformation__productOrServiceCode__description")
        vendor_name = get("content__IDV__vendor__vendorHeader__vendorName")
        uei = get("content__IDV__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__UEI")
        parent_uei = get("content__IDV__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__ultimateParentUEI")
        parent_name = get("content__IDV__vendor__vendorSiteDetails__entityIdentifiers__vendorUEIInformation__ultimateParentUEIName")
        cage_code = get("content__IDV__vendor__vendorSiteDetails__entityIdentifiers__cageCode")
        vendor_city = get("content__IDV__vendor__vendorSiteDetails__vendorLocation__city")
        vendor_state = get("content__IDV__vendor__vendorSiteDetails__vendorLocation__state")
        vendor_zip = get("content__IDV__vendor__vendorSiteDetails__vendorLocation__ZIPCode")
        vendor_country = get("content__IDV__vendor__vendorSiteDetails__vendorLocation__countryCode")
        contracting_agency = get("content__IDV__purchaserInformation__contractingOfficeAgencyID__name")
        contracting_office = get("content__IDV__purchaserInformation__contractingOfficeID__name")
        funding_agency = get("content__IDV__purchaserInformation__fundingRequestingAgencyID__name")
        funding_office = get("content__IDV__purchaserInformation__fundingRequestingOfficeID__name")
        pop_city = ""
        pop_state = ""
        pop_country = ""
        contract_pricing = get("content__IDV__contractData__typeOfContractPricing__description")
        extent_competed = get("content__IDV__competition__extentCompeted__description")
        set_aside = ""
        small_biz = ""

    # Clean obligated amount (can come as string with commas)
    try:
        obligated_float = float(str(obligated).replace(",", "").replace("$", ""))
    except (ValueError, TypeError):
        obligated_float = 0.0
    try:
        total_obligated_float = float(str(total_obligated).replace(",", "").replace("$", ""))
    except (ValueError, TypeError):
        total_obligated_float = 0.0
    try:
        base_options_float = float(str(base_and_options).replace(",", "").replace("$", ""))
    except (ValueError, TypeError):
        base_options_float = 0.0

    return {
        "piid": piid,
        "ref_idv_piid": ref_idv_piid,
        "mod_number": mod_number,
        "contract_type": record.get("contract_type", ""),
        "title": record.get("title", ""),
        "obligated_amount": obligated_float,
        "total_obligated_amount": total_obligated_float,
        "base_and_all_options_value": base_options_float,
        "description": description,
        "action_type": action_type,
        "action_type_description": action_type_desc,
        "signed_date": signed_date,
        "effective_date": effective_date,
        "completion_date": completion_date,
        "ultimate_completion_date": ultimate_completion,
        "naics_code": naics,
        "naics_description": naics_desc,
        "psc_code": psc,
        "psc_description": psc_desc,
        "vendor_name": vendor_name,
        "uei": uei,
        "parent_uei": parent_uei,
        "parent_name": parent_name,
        "cage_code": cage_code,
        "vendor_city": vendor_city,
        "vendor_state": vendor_state,
        "vendor_zip": vendor_zip,
        "vendor_country": vendor_country,
        "contracting_agency": contracting_agency,
        "contracting_office": contracting_office,
        "funding_agency": funding_agency,
        "funding_office": funding_office,
        "pop_city": pop_city,
        "pop_state": pop_state,
        "pop_country": pop_country,
        "contract_pricing": contract_pricing,
        "extent_competed": extent_competed,
        "set_aside": set_aside,
        "business_size": small_biz,
        "last_modified": record.get("modified", ""),
        "fpds_link": record.get("link__href", ""),
    }


def fetch_task_orders(idv_piid):
    """Fetch all task orders referencing a given IDV PIID from FPDS."""
    request = fpdsRequest(REF_IDV_PIID=idv_piid)
    records = asyncio.run(request.data())
    return records


def main():
    resume = "--resume" in sys.argv

    input_file = PROJECT_DIR / "data" / "parsed_contractors.json"
    output_file = PROJECT_DIR / "data" / "wexmac_task_orders_fpds.json"
    progress_file = PROJECT_DIR / "data" / "fpds_fetch_progress.json"

    print(f"Loading contractors from {input_file}")
    with open(input_file) as f:
        contractors = json.load(f)

    print(f"Loaded {len(contractors)} contractors")
    print(f"Querying FPDS ATOM feed for task orders under each WEXMAC IDV")
    print(f"Rate limit delay: {REQUEST_DELAY}s between queries")
    print()

    # Load progress if resuming
    completed_piids = set()
    existing_results = {}
    if resume and output_file.exists():
        with open(output_file) as f:
            prev = json.load(f)
        for entry in prev.get("idvs", []):
            piid = entry.get("idv_piid", "")
            if piid:
                completed_piids.add(piid)
                existing_results[piid] = entry
        print(f"Resuming: {len(completed_piids)} IDVs already queried")
    elif resume and progress_file.exists():
        with open(progress_file) as f:
            completed_piids = set(json.load(f))
        print(f"Resuming from progress file: {len(completed_piids)} already done")

    all_idv_results = []
    all_task_orders = []
    total_task_orders = 0
    total_obligated = 0.0
    errors = []

    for i, contractor in enumerate(contractors, 1):
        name = contractor["name"]
        idv_piid = contractor["award_number"]  # e.g. N0002325D0001
        uei = contractor.get("uei", "")

        # Check resume
        if idv_piid in completed_piids and idv_piid in existing_results:
            entry = existing_results[idv_piid]
            all_idv_results.append(entry)
            total_task_orders += entry.get("task_order_count", 0)
            total_obligated += entry.get("total_obligated", 0)
            for to in entry.get("task_orders", []):
                all_task_orders.append(to)
            count = entry.get("task_order_count", 0)
            print(f"[{i}/{len(contractors)}] {name} ({idv_piid}) - CACHED ({count} task orders)")
            continue

        if idv_piid in completed_piids:
            print(f"[{i}/{len(contractors)}] {name} ({idv_piid}) - skipped (in progress file)")
            continue

        print(f"[{i}/{len(contractors)}] {name} ({idv_piid})")

        time.sleep(REQUEST_DELAY)

        try:
            raw_records = fetch_task_orders(idv_piid)

            # Save raw response
            if raw_records:
                save_api_response(
                    f"fpds_ref_idv_{idv_piid}",
                    {"REF_IDV_PIID": idv_piid},
                    raw_records,
                )

            # Extract clean fields
            task_orders = [extract_fields(r) for r in raw_records]
            idv_obligated = sum(to["obligated_amount"] for to in task_orders)

            entry = {
                "contractor_name": name,
                "idv_piid": idv_piid,
                "idv_piid_dashes": contractor.get("award_number_dashes", ""),
                "contractor_uei": uei,
                "contractor_location": contractor.get("location", ""),
                "task_order_count": len(task_orders),
                "total_obligated": idv_obligated,
                "task_orders": task_orders,
            }
            all_idv_results.append(entry)
            all_task_orders.extend(task_orders)
            total_task_orders += len(task_orders)
            total_obligated += idv_obligated

            if task_orders:
                print(f"    -> {len(task_orders)} task orders, ${idv_obligated:,.2f} obligated")
                for to in task_orders:
                    print(f"       {to['piid']} | {to['action_type_description']} | ${to['obligated_amount']:,.2f} | {to['description'][:70]}")
            else:
                print(f"    -> 0 task orders")

            completed_piids.add(idv_piid)
            # Save progress
            progress_file.parent.mkdir(parents=True, exist_ok=True)
            with open(progress_file, "w") as f:
                json.dump(sorted(completed_piids), f)

        except Exception as e:
            print(f"    ERROR: {e}")
            errors.append({"name": name, "idv_piid": idv_piid, "error": str(e)})
            completed_piids.add(idv_piid)
            all_idv_results.append({
                "contractor_name": name,
                "idv_piid": idv_piid,
                "contractor_uei": uei,
                "error": str(e),
                "task_order_count": 0,
                "total_obligated": 0,
                "task_orders": [],
            })

        # Save intermediate results every 20 contractors
        if i % 20 == 0:
            print(f"    [Saving intermediate... {total_task_orders} task orders so far]")
            _save_output(output_file, all_idv_results, all_task_orders, total_task_orders, total_obligated, errors)

    # Final save
    _save_output(output_file, all_idv_results, all_task_orders, total_task_orders, total_obligated, errors)

    # Summary
    print(f"\n{'=' * 70}")
    print(f"FPDS WEXMAC TASK ORDER FETCH COMPLETE")
    print(f"{'=' * 70}")
    print(f"  IDVs queried:         {len(all_idv_results)}")
    print(f"  IDVs with task orders: {sum(1 for r in all_idv_results if r['task_order_count'] > 0)}")
    print(f"  Total task orders:     {total_task_orders}")
    print(f"  Total obligated:       ${total_obligated:,.2f}")
    if errors:
        print(f"  Errors:                {len(errors)}")
        for e in errors:
            print(f"    - {e['name']}: {e['error']}")
    print(f"\nOutput: {output_file}")

    if all_task_orders:
        print(f"\nAll WEXMAC task orders found:")
        print(f"{'PIID':<20} {'Vendor':<35} {'Obligated':>15} {'Description'}")
        print("-" * 110)
        for to in sorted(all_task_orders, key=lambda x: x["obligated_amount"], reverse=True):
            print(f"{to['piid']:<20} {to['vendor_name']:<35} ${to['obligated_amount']:>14,.2f} {to['description'][:40]}")


def _save_output(output_file, idv_results, task_orders, total_count, total_obligated, errors):
    """Save consolidated output."""
    output = {
        "metadata": {
            "description": "WEXMAC TITUS task orders from FPDS ATOM feed",
            "source": "FPDS (Federal Procurement Data System)",
            "query_method": "REF_IDV_PIID for each N00023-25-D-* IDV",
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "idv_count": len(idv_results),
            "idvs_with_task_orders": sum(1 for r in idv_results if r["task_order_count"] > 0),
            "total_task_orders": total_count,
            "total_obligated": total_obligated,
        },
        "errors": errors,
        "idvs": idv_results,
    }
    with open(output_file, "w") as f:
        json.dump(output, f, indent=2, default=str)


if __name__ == "__main__":
    main()
