import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/server';

export async function POST(request: NextRequest) {
    try {
        const { sql } = await request.json();

        if (!sql || typeof sql !== 'string') {
            return NextResponse.json({
                success: false,
                error: 'SQL query is required'
            }, { status: 400 });
        }

        // Basic security: only allow SELECT statements
        const trimmedSql = sql.trim().toLowerCase();
        if (!trimmedSql.startsWith('select')) {
            return NextResponse.json({
                success: false,
                error: 'Only SELECT queries are allowed'
            }, { status: 400 });
        }

        const db = await getDb();

        const startTime = Date.now();
        const result = await db.executeQuery(sql);
        const executionTime = Date.now() - startTime;

        // Convert result to a more usable format
        const columns = result.columns || [];
        const rows = result.rows.map((row: any) => {
            const obj: Record<string, any> = {};
            columns.forEach((col: any, index: number) => {
                obj[col] = row[index];
            });
            return obj;
        });

        return NextResponse.json({
            success: true,
            result: {
                columns,
                rows,
                rowCount: rows.length,
                executionTime
            }
        });

    } catch (error) {
        console.error('Database query API error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
} 