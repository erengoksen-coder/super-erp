// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

// Simulate a pick list route optimization algorithm (WMS)
export const GET = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        const pickList = [
            { id: '1', product_sku: 'MAM-001', product_name: 'Ahşap Ayak (Meşe)', quantity: 20, location: 'A-01-02', status: 'pending' },
            { id: '3', product_sku: 'MAM-023', product_name: 'Keten Kumaş (Gri)', quantity: 30, location: 'B-01-01', status: 'pending' },
            { id: '2', product_sku: 'MAM-012', product_name: 'Koltuk Süngeri (32 DNS)', quantity: 15, location: 'A-02-04', status: 'pending' },
            { id: '4', product_sku: 'MAM-055', product_name: 'Zımba Teli', quantity: 50, location: 'C-05-12', status: 'pending' },
            { id: '5', product_sku: 'MAM-061', product_name: 'Çelik Profil (2mm)', quantity: 10, location: 'D-01-01', status: 'pending' },
        ];

        // Optimize the picking route by sorting alphanumerically (Snake/Zig-zag path simulation)
        const optimizedRoute = pickList.sort((a, b) => a.location.localeCompare(b.location));

        return NextResponse.json({ success: true, data: optimizedRoute });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
