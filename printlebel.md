### inventory sidebar menu add link print product lebel


### Add products to generate Labels
    Information to show in Labels
        1. Information about the product 
            - product name: [ProductName] [color] [size]...
            - barcode: [Barcode]
            - HSN Code: [HSN Code]
            -No. of labels: [No of labels]
            
        2. Information about the label
            - is expiry date required (Y/N): [Y/N]
            - is batch number required (Y/N): [Y/N]
            - is serial number required (Y/N): [Y/N]
        3. Information about the packings
            - Packing Date: [Packing Date] if is expiry date required and is batch number required
            - Expiry Date: [Expiry Date] if is expiry date required
            - Batch Number: [Batch Number] if is batch number required
            - Serial Number: [Serial Number] if is serial number required
            - Price: [Price]

        4. Information about the shop
            - shop name: [Shop Name] (Y/N): [Y]
            - shop address: [Shop Address] (Y/N): [Y]
            - shop phone: [Shop Phone] (Y/N): [Y]
            - shop email: [Shop Email] (Y/N): [Y]
            - shop logo: [Shop Logo] (Y/N): [Y]
        5. Information about the label
            - QR Code: [QR Code] (Y/N): [Y]
            - Barcode: [Barcode] (Y/N): [Y]
        6. Information about the price
            - Retail Price: [Retail Price] (Y/N): [Y]
            - Wholesale Price: [Wholesale Price] (Y/N): [Y]
            - Discount Price: [Discount Price] (Y/N): [Y]

        7. Information about the label size
            - Label Size: [Label Size] (Y/N): [Y]
            - Label Width: [Label Width] (Y/N): [Y]
            - Label Height: [Label Height] (Y/N): [Y]

BarCode Setting:
- level per sheet : 20,
    - sheet size 8.5" X 11.5"
    - level size 4" X 1"
- level per sheet : 30
    - sheet size  8.5" X 11.5"
    - level size 2"X2"  
- level per sheet : 32
    - sheet size 8.5" X 11.5"
    - level size 2"X1.5"
- level per sheet : 40
    - sheet size 8.5" X 11.5"
    - level size 2" x 1"
- level per sheet : 50
    - sheet size 8.5" X 11.5"
    - level size 1.5" x 1"
- continuous roll (3" width)
    - 31.75 mm X 25.40 mm
    - gap : 3.18 mm
    - length: 25.40 mm


### validations rules:
    - selection wise level is overflow print label
    - Barcode:
        - if is expiry date required and is batch number required and is serial number required
        - in barcode include product id, batch number, expiry date, serial number 
        - adjust with paper size and label size
        - barcode length 
            -