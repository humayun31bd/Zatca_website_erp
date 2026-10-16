import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { branches, suppliers, clients } from "@/lib/db/schema";
import { employees } from "@/lib/db/hr_schema";
import { deliveryDrivers } from "@/lib/db/delivery_orders_schema";
import { eq } from "drizzle-orm";
import { verifySession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySession(req);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tenantId = session.tenantId as string;

    const [branchList, employeeList, driverList, supplierList, clientList] = await Promise.all([
      db.select({ id: branches.id, name: branches.name }).from(branches).where(eq(branches.tenantId, tenantId)),
      db.select({ id: employees.id, firstName: employees.firstName, lastName: employees.lastName, nationalId: employees.nationalId, departmentName: employees.departmentName }).from(employees).where(eq(employees.tenantId, tenantId)),
      db.select({ id: deliveryDrivers.id, name: deliveryDrivers.name, vehiclePlate: deliveryDrivers.vehiclePlate, vehicleType: deliveryDrivers.vehicleType }).from(deliveryDrivers).where(eq(deliveryDrivers.tenantId, tenantId)),
      db.select({ id: suppliers.id, name: suppliers.name, crNumber: suppliers.crNumber, vatNumber: suppliers.vatNumber }).from(suppliers).where(eq(suppliers.tenantId, tenantId)),
      db.select({ id: clients.id, name: clients.name, vatNumber: clients.vatNumber, phoneNumber: clients.phoneNumber }).from(clients).where(eq(clients.tenantId, tenantId)),
    ]);

    const formattedEmployees = employeeList.map(e => ({
      id: e.id,
      name: `${e.firstName || ''} ${e.lastName || ''}`.trim() || 'Employee',
      code: e.nationalId ? `ID:${e.nationalId}` : e.id.slice(0, 8).toUpperCase(),
      department: e.departmentName || '',
    }));

    const formattedVehicles = driverList.map(d => ({
      id: d.id,
      name: `${d.vehicleType ? d.vehicleType.toUpperCase() : 'Vehicle'}: ${d.name}${d.vehiclePlate ? ` [${d.vehiclePlate}]` : ''}`,
      plate: d.vehiclePlate || '',
      driverName: d.name,
      type: d.vehicleType || 'VEHICLE',
    }));

    return NextResponse.json({
      success: true,
      sources: {
        branches: branchList.map(b => ({ id: b.id, name: b.name, code: b.id.slice(0, 8).toUpperCase() })),
        employees: formattedEmployees,
        vehicles: formattedVehicles,
        suppliers: supplierList.map(s => ({
          id: s.id,
          name: s.name,
          code: s.crNumber ? `CR:${s.crNumber}` : (s.vatNumber ? `VAT:${s.vatNumber}` : s.id.slice(0, 8).toUpperCase())
        })),
        customers: clientList.map(c => ({
          id: c.id,
          name: c.name,
          code: c.vatNumber ? `VAT:${c.vatNumber}` : (c.phoneNumber ? `TEL:${c.phoneNumber}` : c.id.slice(0, 8).toUpperCase())
        })),
      }
    });
  } catch (error: any) {
    console.error("GET Cost Center Sources Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
