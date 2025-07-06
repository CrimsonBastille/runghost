import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server';

export async function GET(request: NextRequest) {
    try {
        const db = await getDb();

        // Get all table names and their record counts
        const tables = await db.getTables();

        return NextResponse.json({
            success: true,
            tables
        });

    } catch (error) {
        console.error('Database tables API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 