
import { NextResponse } from 'next/server';
import { Meeting, ActionItem } from '@/types';
import { getSessionUser } from '@/lib/supabase-server';
import { rateLimitResponse } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const limited = await rateLimitResponse('export', sessionUser.id);
    if (limited) return limited;

    const { meeting, actionItems }: { meeting: Meeting; actionItems: ActionItem[] } = await req.json();

    // pptxgenjs runs fine on the server (Node.js has fs)
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();

    pptx.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 });
    pptx.layout = 'WIDE';

    const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
      URGENT: { color: 'ef4444', bg: '7f1d1d', label: '🔴 URGENT' },
      HIGH:   { color: 'f59e0b', bg: '78350f', label: '🟠 HIGH' },
      MEDIUM: { color: '3b82f6', bg: '1e3a5f', label: '🔵 MEDIUM' },
      LOW:    { color: '22c55e', bg: '14532d', label: '🟢 LOW' },
    };

    // ─── Cover Slide ───
    const cover = pptx.addSlide();
    cover.background = { fill: '0a0b14' };
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { type: 'solid', color: '7c3aed' } });
    cover.addText(meeting.title, { x: 0.8, y: 1.5, w: 11.7, h: 1.2, fontSize: 40, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
    cover.addText('Meeting Action Points — AI Generated', { x: 0.8, y: 2.9, w: 11.7, h: 0.5, fontSize: 18, color: 'a78bfa', fontFace: 'Calibri' });
    const date = new Date(meeting.meetingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    cover.addText(`${meeting.meetingType} Meeting · ${date} · ${actionItems.length} Action Points`, {
      x: 0.8, y: 3.6, w: 11.7, h: 0.4, fontSize: 13, color: '64748b', fontFace: 'Calibri',
    });
    cover.addShape(pptx.ShapeType.rect, { x: 0, y: 7.4, w: '100%', h: 0.1, fill: { type: 'solid', color: '7c3aed' } });

    // ─── Summary Slide ───
    if (meeting.summary) {
      const sumSlide = pptx.addSlide();
      sumSlide.background = { fill: '0f172a' };
      sumSlide.addText('Executive Summary', { x: 0.7, y: 0.4, w: 11.9, h: 0.6, fontSize: 26, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
      sumSlide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.05, w: 1.5, h: 0.04, fill: { type: 'solid', color: '7c3aed' } });
      sumSlide.addText(meeting.summary, { x: 0.7, y: 1.3, w: 11.9, h: 5, fontSize: 14, color: 'cbd5e1', fontFace: 'Calibri', valign: 'top', wrap: true });
    }

    // ─── One slide per action item ───
    actionItems.forEach((item, i) => {
      const slide = pptx.addSlide();
      slide.background = { fill: '0f172a' };
      const pc = priorityConfig[item.priority] || priorityConfig.MEDIUM;

      slide.addShape(pptx.ShapeType.roundRect, { x: 0.7, y: 0.35, w: 1.4, h: 0.38, fill: { type: 'solid', color: pc.bg }, rectRadius: 0.05 });
      slide.addText(pc.label, { x: 0.7, y: 0.35, w: 1.4, h: 0.38, fontSize: 10, bold: true, color: pc.color, align: 'center', valign: 'middle', fontFace: 'Calibri' });
      slide.addText(`Action ${i + 1} of ${actionItems.length}`, { x: 10.5, y: 0.35, w: 2.1, h: 0.38, fontSize: 11, color: '475569', align: 'right', fontFace: 'Calibri' });
      slide.addText(item.title, { x: 0.7, y: 0.9, w: 11.9, h: 0.8, fontSize: 22, bold: true, color: 'F1F5F9', fontFace: 'Calibri' });
      slide.addShape(pptx.ShapeType.rect, { x: 0.7, y: 1.75, w: 11.9, h: 0.02, fill: { type: 'solid', color: '1e293b' } });

      slide.addText('Description', { x: 0.7, y: 1.9, w: 11.9, h: 0.3, fontSize: 10, bold: true, color: '94a3b8', fontFace: 'Calibri' });
      slide.addText(item.description || 'No description provided.', { x: 0.7, y: 2.2, w: 11.9, h: 0.9, fontSize: 13, color: 'cbd5e1', fontFace: 'Calibri', wrap: true });

      const metaItems = [
        { label: 'Assigned To', value: item.assigneeName || 'Unassigned' },
        { label: 'Due Date', value: new Date(item.dueDate).toLocaleDateString('en-GB') },
        { label: 'Status', value: item.status },
      ];
      metaItems.forEach((meta, j) => {
        const xPos = 0.7 + j * 4;
        slide.addShape(pptx.ShapeType.roundRect, { x: xPos, y: 3.25, w: 3.7, h: 0.85, fill: { type: 'solid', color: '1e293b' }, rectRadius: 0.08 });
        slide.addText(meta.label, { x: xPos + 0.15, y: 3.3, w: 3.4, h: 0.3, fontSize: 9, color: '64748b', fontFace: 'Calibri' });
        slide.addText(meta.value, { x: xPos + 0.15, y: 3.6, w: 3.4, h: 0.4, fontSize: 13, bold: true, color: 'F1F5F9', fontFace: 'Calibri' });
      });

      if (item.aiGuidance) {
        slide.addText('AI Execution Guidance', { x: 0.7, y: 4.3, w: 11.9, h: 0.3, fontSize: 10, bold: true, color: '94a3b8', fontFace: 'Calibri' });
        const cleanGuidance = item.aiGuidance.replace(/#{1,6}\s/g, '').replace(/\*\*/g, '').replace(/\*/g, '').slice(0, 500);
        slide.addText(cleanGuidance, { x: 0.7, y: 4.65, w: 11.9, h: 2.4, fontSize: 11, color: '94a3b8', fontFace: 'Calibri', wrap: true, valign: 'top' });
      }
      slide.addText(`${i + 1}`, { x: 12.8, y: 7.2, w: 0.4, h: 0.3, fontSize: 9, color: '334155', align: 'right', fontFace: 'Calibri' });
    });

    // ─── Closing Slide ───
    const closing = pptx.addSlide();
    closing.background = { fill: '0a0b14' };
    closing.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.08, fill: { type: 'solid', color: '7c3aed' } });
    closing.addText('Next Steps & Follow-Up', { x: 0.8, y: 2.5, w: 11.7, h: 1, fontSize: 36, bold: true, color: 'FFFFFF', fontFace: 'Calibri' });
    closing.addText(
      `All ${actionItems.length} action points have been assigned and are tracked in the Meeting Intelligence Platform.\nManagers will receive notifications for review and approval.`,
      { x: 0.8, y: 3.7, w: 11.7, h: 1.5, fontSize: 15, color: '94a3b8', fontFace: 'Calibri', wrap: true }
    );

    // Generate as base64 and send back
    const base64 = await pptx.write({ outputType: 'base64' }) as string;
    const buffer = Buffer.from(base64, 'base64');

    const fileName = `${meeting.title.replace(/[^a-z0-9]/gi, '_')}_Action_Points.pptx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (err: unknown) {
    console.error('PPTX generation error:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate PPTX';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
