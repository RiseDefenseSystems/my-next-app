import { NextRequest, NextResponse } from 'next/server';
import { getDocuments, deleteDocument } from '@/lib/rag';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 30;

    const documents = await getDocuments(limit);

    return NextResponse.json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error: unknown) {
    console.error('Error in GET /api/rag/documents:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let documentId = Number(searchParams.get('id'));

    if (!documentId) {
      const body = await req.json().catch(() => ({}));
      documentId = Number(body.documentId || body.id);
    }

    if (!documentId || isNaN(documentId)) {
      return NextResponse.json(
        { error: 'Valid documentId is required.' },
        { status: 400 }
      );
    }

    const deleted = await deleteDocument(documentId);

    if (!deleted) {
      return NextResponse.json(
        { error: `Document #${documentId} not found or could not be deleted.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Document #${documentId} and its associated vector chunks have been purged.`,
      documentId,
    });
  } catch (error: unknown) {
    console.error('Error in DELETE /api/rag/documents:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
