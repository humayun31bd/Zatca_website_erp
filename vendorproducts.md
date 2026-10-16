# Vendor Product Management (VPM) Product Requirements Document

## 1. Purpose

## 2. Scope

## 3. Objectives

## 4. Users and Access
Role based access control (RBAC)
Tenant based access control (TBAC)
Employee based access control (EBAC)
Location based access control (LBAC)
Branch based access control (BBAC)
Sub-Branch based access control (SBBAC)
Zone based access control (ZBAC)
Department based access control (DBAC)
Division based access control (DBAC)
Section based access control (SBAC)
Subsection based access control (SSBAC)

## 5. Functional Requirements
## Meaning

“**Delivery company product assignment**” usually means assigning products or delivery orders to the correct driver, vehicle, route, warehouse, or delivery team. In logistics, it is part of last-mile delivery—the movement of goods from a distribution center to the final customer. [ascm](https://www.ascm.org/topics/last-mile-delivery/)

For example:
> Order #105 contains 3 products. The dispatcher assigns it to Driver A, Vehicle V-12, Route Zone 3, with delivery scheduled for 10:00–12:00.

## What is assigned?

A delivery company may assign:

- Product or order number.
- Customer name, phone number, and address.
- Quantity, weight, size, and package type.
- Driver or rider.
- Vehicle type and vehicle capacity.
- Delivery area or route.
- Pickup warehouse or collection point.
- Delivery date and time.
- Cash-on-delivery amount, if applicable.
- Special instructions, such as fragile, refrigerated, or urgent delivery.
- Return or exchange responsibility.

A product should normally have a unique SKU or barcode so the company can track inventory and reduce picking mistakes. [detrack](https://www.detrack.com/blog/logistics-abbreviations/)

## Standard assignment process

1. **Receive the order**  
   The company receives the customer’s order from an online store, phone call, marketplace, or business client.

2. **Check product availability**  
   Warehouse staff confirm that the correct product and quantity are available.

3. **Pick and pack**  
   Workers collect the product, pack it, attach the label, and record the order number.

4. **Group orders by location**  
   Orders are grouped according to area, delivery deadline, vehicle capacity, and traffic conditions.

5. **Assign driver and vehicle**  
   The dispatcher selects a driver based on availability, distance, workload, vehicle type, and route efficiency. [osforyour](https://www.osforyour.business/courier-services/workflows/dispatch-and-driver-assignment)

6. **Dispatch the product**  
   The driver receives the delivery list through an app, WhatsApp, printed sheet, or delivery-management system.

7. **Track delivery status**  
   Common statuses include:

   - Assigned.
   - Picked up.
   - Out for delivery.
   - Delivered.
   - Customer unavailable.
   - Delivery failed.
   - Returned to warehouse.

8. **Confirm delivery**  
   The company collects proof of delivery, such as a customer signature, OTP, photo, GPS location, or cash receipt.

## Example assignment table

| Order | Product | Customer area | Driver | Vehicle | Status |
|---|---|---|---|---|---|
| ORD-1001 | Coffee machine, 1 unit | Deira | Ahmed | Van V-04 | Out for delivery |
| ORD-1002 | Mobile accessories, 5 units | Bur Dubai | Rahim | Motorcycle M-11 | Assigned |
| ORD-1003 | Perfume cartons, 2 boxes | Al Barsha | Karim | Van V-08 | Delivered |

## Important information for the driver

The driver should receive:

- Order number.
- Customer name and mobile number.
- Exact delivery address or map location.
- Number of packages.
- Collection amount.
- Delivery time window.
- Product handling instructions.
- Customer signature or OTP requirement.
- Return procedure if delivery fails.

## Product assignment versus driver assignment

These terms are related but different:

| Term | Meaning |
|---|---|
| Product assignment | Allocating a specific product or order to a route, warehouse, vehicle, or driver |
| Driver assignment | Selecting the driver responsible for delivery |
| Route assignment | Allocating a geographical area or sequence of stops |
| Dispatch | Sending the assigned order and driver for delivery |
| Proof of delivery | Evidence that the customer received the product |


### 5.1 Delivery Company (Aramex, SMSA, etc)
1. Delivery Company entry
2. Delivery Company import
3. Delivery Company list
4. Delivery Company edit
5. Delivery Company delete
6. Delivery Company Opening Balance
7. Delivery Company Opening Balance import
8. Delivery Company Opening Balance list
9. Delivery Company Opening Balance edit
10. Delivery Company Opening Balance delete 
11. Delivery Company Import/Export

## Delivery Company Product Assign 
1. Delivery Company Product Assign entry
2. Delivery Company Product Assign import
3. Delivery Company Product Assign list
4. Delivery Company Product Assign edit
5. Delivery Company Product Assign delete 
6. Delivery Company Product Assign Import/Export

## Vendor wise Product Imports
1. Vendor wise product entry 
2. Vendor wise product import
3. Vendor wise product list
4. Vendor wise product edit
5. Vendor wise product delete   
6. Vendor Opening Balance
7. Vendor Opening Balance import
8. Vendor Opening Balance list
9. Vendor Opening Balance edit
10. Vendor Opening Balance delete 
11. Vendor Import/Export

## Customer
1. Customer entry
2. Customer import
3. Customer list
4. Customer edit
5. Customer delete  
6. Customer Opening Balance
7. Customer Import/Export

## Stock Report
1. Stock report
2. Stock report edit
3. Stock report delete
4. Stock report import
5. Stock report export  

## Delivery Note (multiple products) pick & received last hour balance stock report last hour. 
1. Delivery note entry (multiple products)
2. Delivery note import (multiple products)
3. Delivery note list (multiple products)
4. Delivery note edit (multiple products)
5. Delivery note delete (multiple products)  

## Customer Orders (Pending/Delivered/Paid/Canceled/returned/Cash Collections/profit)
1. Customer order entry (multiple products)
2. Customer order import (multiple products)
3. Customer order list (multiple products)
4. Customer order edit (multiple products) (only Pending/Canceled/returned)
5. Customer order delete (multiple products) (only Pending/Canceled/returned)
6. Customer order status update (Pending/Delivered/Paid/Canceled/returned) (only Pending/Canceled/returned)
7. Customer order payment status update (Pending/Delivered/Paid/Canceled/returned) (only Pending/Canceled/returned)
8. Customer order profit report

## Customer Order Return
1. Customer order return entry (multiple products)
2. Customer order return import (multiple products)
3. Customer order return list (multiple products)
4. Customer order return edit (multiple products)
5. Customer order return delete (multiple products)
6. Customer order return status update (Pending/Delivered/Paid/Canceled/returned) (only Pending/Canceled/returned)
7. Customer order return payment status update (Pending/Delivered/Paid/Canceled/returned) (only Pending/Canceled/returned)
8. Customer order return profit report
9. Customer order return Import/Export

## Marge Stock List
1. Marge stock list
2. Marge stock list edit
3. Marge stock list delete
4. Marge stock list import
5. Marge stock list export  

## Collect payment
1. Collect payment entry
2. Collect payment import
3. Collect payment list
4. Collect payment edit
5. Collect payment delete
6. Collect payment export

## Delivery Expense (Billed & Unbilled)
1. Delivery Expense entry
2. Delivery Expense import
3. Delivery Expense list
4. Delivery Expense edit
5. Delivery Expense delete

## Report
1. Product wise invoice report
2. Customer wise product report
3. Vendor wise product report
4. Customer Ledger (Detail/Summary)
5. Vendor Ledger (Detail/Summary)
6. Stock Ledger (Detail/Summary)
7. Profit Report (Detail/Summary)
8. Sales Report (Detail/Summary)
9. Purchase Report (Detail/Summary)
10. Balance Dashboard (Tenants / Customers / Vendors / Stock / Profit )




