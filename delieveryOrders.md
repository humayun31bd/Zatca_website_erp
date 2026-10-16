### Delivery Order Management

## Order status Keys and Values
    OUP	Order Under Process	
    RTS	Ready to Serve	
    WFC	Waiting For Confirmation	
    TA	Takeaway	
    Dlvd    Delivered	
    Srvd	Served	
    RFT	Ready for Takeaway	
    RFD	Ready for Delivery	
    OOW	Order on the Way	


1. Order Creation
    source 
    - pos screen
    - online order
    - third party orders

    
2. Order Processing 
    - Dine IN
    - Take Away
    - Delivery
    - Online Delivery

3. Order Delivery 
    - self delivery (In-house driver assignment, driver contact, vehicle info, tracking)
    - third party delivery:
        - Jahez (جاهز)
        - HungerStation (هنقرستيشن)
        - Marsool (مرسول)
        - ToYou (تويو)
        - Ninja (نينجا)
        - Careem Box / Barq
        - Custom Third-Party Aggregator

4. Order Cancellation
    - by server (Kitchen out of stock, station closed)
    - by customer (Requested before preparation)
    - by admin (Manager void, duplicate order)
    - Cancellation reason code & audit trail

5. Order Lifecycle Flow by Type:
    - Dine IN:
      WFC (Waiting Confirmation) -> OUP (In Kitchen) -> RTS (Ready to Serve) -> Srvd (Served) -> Closed
    - Take Away:
      WFC -> OUP -> RFT (Ready for Takeaway) -> TA / Dlvd (Handed to Customer)
    - Self Delivery:
      WFC -> OUP -> RFD (Ready for Delivery) -> OOW (Assigned to Driver & On the Way) -> Dlvd (Delivered with POD)
    - Third Party Delivery:
      WFC -> OUP -> RFD -> OOW (Picked by Rider) -> Dlvd (Confirmed by Platform)

---

## Implementation Roadmap & Step-by-Step Prompts

### Prompt 1: Database Schema & Status Enums
- Create `delivery_orders` and `order_status_logs` schema in backend SQLite/Drizzle.
- Add status enum codes (`OUP`, `RTS`, `WFC`, `TA`, `Dlvd`, `Srvd`, `RFT`, `RFD`, `OOW`, `CANCELLED`).
- Store channel (`pos`, `online`, `third_party`), aggregator name, driver details, delivery fee, customer address.

### Prompt 2: Backend REST APIs & State Transitions
- `POST /api/v1/orders/delivery` - Create delivery order.
- `GET /api/v1/orders/delivery` - List & filter by status, channel, and order type.
- `PATCH /api/v1/orders/delivery/:id/status` - Transition status with validation rules.
- `PATCH /api/v1/orders/delivery/:id/assign-driver` - Assign self or third-party driver.
- `POST /api/v1/orders/delivery/:id/cancel` - Cancel order with actor & reason logging.

### Prompt 3: POS Screen Integration
- Integrate with POS screen checkout when Delivery or Dine In is selected.
- Quick customer address & delivery aggregator selection modal.
- Print KOT (Kitchen Order Ticket) and Delivery Dispatch slips with order status barcodes.

### Prompt 4: Order Dispatch & Kitchen Display Board (KDS)
- Build real-time Orders Kanban / Grid screen in frontend (`/orders/delivery`):
  - Columns / Tabs: New/WFC, In Kitchen (OUP), Ready (RTS/RFT/RFD), Out for Delivery (OOW), Delivered/Completed.
  - Quick action status progression buttons (Accept -> Cook -> Ready -> Dispatch -> Deliver).
  - Sound alert on incoming new orders.

### Prompt 5: Driver Fleet & Delivery Management
- Driver assignment dialog (select driver from staff/drivers list or enter rider details).
- Third-party order reference number and rider tracking note.
- Delivery status confirmation with time-stamped proof.

### Prompt 6: Cancellation & Audit Reporting
- Cancellation modal with mandatory reason selection.
- Delivery analytics dashboard: average delivery time, orders per channel (POS vs Jahez vs Hungerstation), driver performance.

