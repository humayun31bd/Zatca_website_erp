**Tenant selects business type** 
    (Retail) → Tenant product table loads for this business type
    (Electronics) → Electronics product table loads for this business type
    (Pharmacy) → Pharmacy product table loads for this business type
    (Apparel) → Apparel product table loads for this business type

**Tenant can create custom product features enable/disable for product as per their business type** 
    - Retail → Tenant can enable/disable product features for product as per their business type
        - Ex:- Variant(sizes,colors,weight),no of images(default 0),no of videos(default 0), show in ecommerce,etc
        - stock policy (enable/disable) , is excizable, is discountable, is tax-free, is publish.
    - Electronics → Tenant can enable/disable product features for product as per their business type
        - Ex:- Brand,Model,Serial Number,colors,No of images(default 0),No of videos(default 0),warranty (enable/disable 1 year/2 year/3 year), show in ecommerce,etc
        - stock policy (enable/disable) , is excizable, is discountable, is tax-free, is publish
    - Mobile Shop → Tenant can enable/disable product features for product as per their business type
        - Ex:- Brand,Model,Serial Number,Storage Size,colors,No of images(default 0),No of videos(default 0),warranty (enable/disable 1 year/2 year/3 year), show in ecommerce,etc
        - stock policy (enable/disable) , is excizable, is discountable 
    - Pharmacy → Tenant can enable/disable product features for product as per their business type
        - Ex:- Menufacturer/Brand,Generic_name,Expire date,Dosage Form,No of images(default 0),No of videos(default 0), show in ecommerce, etc
        - stock policy (enable/disable) , is excizable, is discountable, is_cold_chain(F), is_prescription_required(F)
    - Apparel → Tenant can enable/disable product features for product as per their business type
        - Ex:- Size,Color,Material,Weight,No of images(default 0),No of videos(default 0), show in ecommerce, etc
        - stock policy (enable/disable) , is excizable
    - Salun / beauty  → Tenant can enable/disable product features for product as per their business type
        - Ex:- Service name,Service images,Service description,service tax, show in ecommerce, etc


