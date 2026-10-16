## tenant wise product purchase



### product purchase order sent to supplier by tenant
``` sql
CREATE TABLE product_purchase_order_by_tenant(
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    supplier_id BIGINT NOT NULL REFERENCES supplier(supplier_id),
    reference_no VARCHAR(50) NOT NULL,
    purchase_order_date DATE NOT NULL,
    pay_terms VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    total_items INT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES product(product_id)   ,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    purchase_tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL,
    additional_expense_name_1 VARCHAR(50) NOT NULL,
    additional_expense_name_2 VARCHAR(50) NOT NULL,
    additional_expense_name_3 VARCHAR(50) NOT NULL,
    additional_expense_name_4 VARCHAR(50) NOT NULL,
    additional_cost_1 DECIMAL(10,2) NOT NULL,
    additional_cost_2 DECIMAL(10,2) NOT NULL,
    additional_cost_3 DECIMAL(10,2) NOT NULL,
    additional_cost_4 DECIMAL(10,2) NOT NULL,
    total_after_discount DECIMAL(10,2) NOT NULL,
    total_after_additional_cost DECIMAL(10,2) NOT NULL,
    total_after_tax DECIMAL(10,2) NOT NULL,
    net_total DECIMAL(10,2) NOT NULL,
    total_paid DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse(warehouse_id),
    shipment_method VARCHAR(20) NOT NULL,
    shipment_cost DECIMAL(10,2) NOT NULL,
    attach_pdf_file VARCHAR(255) NOT NULL,
    attach_other_files VARCHAR(255) NOT NULL,
    note VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL (Pending, Received, Partially Returned),
    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by BIGINT NOT NULL,
    deleted_at TIMESTAMP NOT NULL,
    deleted_by BIGINT NOT NULL
)
```

### product purchase received by tenant
``` sql
CREATE TABLE product_purchase_received_by_tenant(
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    supplier_id BIGINT NOT NULL REFERENCES supplier(supplier_id),
    reference_no VARCHAR(50) NOT NULL,
    invoice_id VARCHAR(50) NOT NULL,
    purchase_date DATE NOT NULL,
    
    is_batch_no_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    batch_no VARCHAR(50) NOT NULL,
    manufacturing_license_number VARCHAR(50) NOT NULL,
    
    pay_terms VARCHAR(20) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    total_items INT NOT NULL,
    product_id BIGINT NOT NULL REFERENCES product(product_id)   ,
    quantity INT NOT NULL,
    production_date DATE NOT NULL,
    is_expiry_date_applicable BOOLEAN NOT NULL DEFAULT FALSE,
    expiry_date DATE NOT NULL,
    
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    purchase_tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL,
    additional_expense_name_1 VARCHAR(50) NOT NULL,
    additional_expense_name_2 VARCHAR(50) NOT NULL,
    additional_expense_name_3 VARCHAR(50) NOT NULL,
    additional_expense_name_4 VARCHAR(50) NOT NULL,
    additional_cost_1 DECIMAL(10,2) NOT NULL,
    additional_cost_2 DECIMAL(10,2) NOT NULL,
    additional_cost_3 DECIMAL(10,2) NOT NULL,
    additional_cost_4 DECIMAL(10,2) NOT NULL,
    total_after_discount DECIMAL(10,2) NOT NULL,
    total_after_additional_cost DECIMAL(10,2) NOT NULL,
    total_after_tax DECIMAL(10,2) NOT NULL,
    net_total DECIMAL(10,2) NOT NULL,
    total_paid DECIMAL(10,2) NOT NULL,
    balance DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,
    warehouse_id BIGINT NOT NULL REFERENCES warehouse(warehouse_id),
    shipment_method VARCHAR(20) NOT NULL,
    shipment_cost DECIMAL(10,2) NOT NULL,
    attach_pdf_file VARCHAR(255) NOT NULL,
    attach_other_files VARCHAR(255) NOT NULL,
    note VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL (Pending, Received, Partially Returned),
    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by BIGINT NOT NULL,
    deleted_at TIMESTAMP NOT NULL,
    deleted_by BIGINT NOT NULL
)
```


### product purchase return by tenant
``` sql
CREATE TABLE product_purchase_return_by_tenant(
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    supplier_id BIGINT NOT NULL REFERENCES supplier(supplier_id),
    purchase_order_id BIGINT NOT NULL REFERENCES product_purchase_order_by_tenant(id),
    return_date DATE NOT NULL,
    product_id BIGINT NOT NULL REFERENCES product(product_id)   ,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    purchase_tax DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) NOT NULL,
    total_after_discount DECIMAL(10,2) NOT NULL,
    total_after_tax DECIMAL(10,2) NOT NULL,
    net_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by BIGINT NOT NULL,
    deleted_at TIMESTAMP NOT NULL,
    deleted_by BIGINT NOT NULL
)

```

### product purchase payments by tenant
``` sql
CREATE TABLE product_purchase_payments_by_tenant(
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    supplier_id BIGINT NOT NULL REFERENCES supplier(supplier_id),
    purchase_order_id BIGINT NOT NULL REFERENCES product_purchase_order_by_tenant(id),
    payment_date DATE NOT NULL,
    payment_method VARCHAR(20) NOT NULL (Cash, Credit, Debit Card, Online, Bank Draft, Cheque, Bank Transfer, Other),
    cheque_no VARCHAR(50) NOT NULL,
    cheque_date DATE NOT NULL,
    cheque_clear_on DATE NOT NULL,
    bank_draft_no VARCHAR(50) NOT NULL,
    bank_draft_date DATE NOT NULL,
    bank_draft_clear_on DATE NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by BIGINT NOT NULL,
    deleted_at TIMESTAMP NOT NULL,
    deleted_by BIGINT NOT NULL
)
```

### stock transfer by tenant
``` sql
CREATE TABLE stock_transfer_by_tenant(
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL REFERENCES tenant(tenant_id),
    product_id BIGINT NOT NULL REFERENCES product(product_id)   ,
    quantity INT NOT NULL,
    from_location_id BIGINT NOT NULL REFERENCES warehouse(warehouse_id) or branch(branch_id),
    to_location_id BIGINT NOT NULL REFERENCES warehouse(warehouse_id) or branch(branch_id),
    transfer_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL (Pending, Received, Partially Returned),
    created_at TIMESTAMP NOT NULL,
    created_by BIGINT NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    updated_by BIGINT NOT NULL,
    deleted_at TIMESTAMP NOT NULL,
    deleted_by BIGINT NOT NULL
)
``` 




