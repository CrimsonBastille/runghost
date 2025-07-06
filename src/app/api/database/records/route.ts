import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server';

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const table = url.searchParams.get('table');
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);

        if (!table) {
            return NextResponse.json({
                success: false,
                error: 'Table name is required'
            }, { status: 400 });
        }

        // Security: validate table name to prevent SQL injection
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(table)) {
            return NextResponse.json({
                success: false,
                error: 'Invalid table name'
            }, { status: 400 });
        }

        const db = await getDb();

        // Get table records with pagination
        const result = await db.getTableRecords(table, page, limit);

        return NextResponse.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('Database records API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 