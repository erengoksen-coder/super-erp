// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthUser } from '@/lib/api/withAuth';

// Simulate an AI Vision API that analyzes an image for quality control defects
export const POST = withAuth(async (request: NextRequest, user: AuthUser) => {
    try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Generate mock detection results
        const hasDefects = Math.random() > 0.3; // 70% chance to find defects for demo purposes

        const possibleDefects = [
            { label: 'Eğri Dikiş', color: '#ef4444' }, // Red
            { label: 'Kumaş Kırışıklığı / Potluk', color: '#f59e0b' }, // Amber
            { label: 'Leke / Kir', color: '#8b5cf6' }, // Purple
            { label: 'Sünger Çökmesi', color: '#ec4899' }, // Pink
        ];

        const detections = [];
        let overallStatus = 'passed';
        let confidenceScore = 98.4;

        if (hasDefects) {
            overallStatus = 'failed';
            confidenceScore = 87 + Math.random() * 8; // Random between 87 and 95

            const numDefects = Math.floor(Math.random() * 3) + 1; // 1 to 3 defects
            for (let i = 0; i < numDefects; i++) {
                const defect = possibleDefects[Math.floor(Math.random() * possibleDefects.length)];

                // Randomly place bounding box percentages (avoiding extreme edges)
                const width = 10 + Math.random() * 15; // 10% to 25% width
                const height = 10 + Math.random() * 15; // 10% to 25% height
                const x = 10 + Math.random() * (80 - width);
                const y = 10 + Math.random() * (80 - height);

                detections.push({
                    id: `defect-${Date.now()}-${i}`,
                    label: defect.label,
                    confidence: (80 + Math.random() * 19).toFixed(1), // 80.0% to 99.0%
                    color: defect.color,
                    box: { x, y, width, height }
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                status: overallStatus,
                confidence_score: confidenceScore.toFixed(1),
                timestamp: new Date().toISOString(),
                detections,
                summary: hasDefects
                    ? `${detections.length} adet potansiyel kalite kusuru tespit edildi. Ürün tamir bandına yönlendirilmeli.`
                    : 'Herhangi bir kalite kusuru bulunamadı. Ürün standartlara uygundur.'
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
