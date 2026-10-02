import io
from datetime import datetime, timezone
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_aar_pdf(aar_data: dict, exercise_metadata: dict, decisions: list) -> bytes:
    """
    Generates a professional defense-training After Action Review (AAR) PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom palette
    primary_color = colors.HexColor("#0f172a") # Slate 900
    accent_color = colors.HexColor("#0284c7")  # Sky 600
    muted_color = colors.HexColor("#475569")   # Slate 600
    border_color = colors.HexColor("#cbd5e1")  # Slate 300

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=muted_color,
        spaceAfter=12
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=accent_color,
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=primary_color
    )

    bold_body = ParagraphStyle(
        'BoldBody',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title & Header
    story.append(Paragraph("SENTINEL-X — AFTER ACTION REVIEW (AAR)", title_style))
    story.append(Paragraph(
        f"Multi-Domain Decision Training Simulator | Problem Statement 26248 | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        subtitle_style
    ))
    story.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=12))

    # Exercise Metadata Table
    code = exercise_metadata.get("code", "SNTL-4821")
    scenario = exercise_metadata.get("scenario_name", "Operation Sentinel")
    duration = f"{exercise_metadata.get('duration_seconds', 0)} seconds"
    status = exercise_metadata.get("status", "COMPLETED")

    meta_table_data = [
        [
            Paragraph("<b>Exercise Code:</b>", body_style), Paragraph(code, bold_body),
            Paragraph("<b>Scenario:</b>", body_style), Paragraph(scenario, body_style)
        ],
        [
            Paragraph("<b>Execution Status:</b>", body_style), Paragraph(status, body_style),
            Paragraph("<b>Elapsed Duration:</b>", body_style), Paragraph(duration, body_style)
        ]
    ]

    t_meta = Table(meta_table_data, colWidths=[100, 160, 100, 180])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Communication Resilience & Degradation Metrics
    story.append(Paragraph("1. COMMUNICATION RESILIENCE & TELEMETRY SUMMARY", section_heading))
    metrics = aar_data.get("metrics_summary", {})
    dq = aar_data.get("decision_quality_metrics", {})

    metrics_table_data = [
        [
            Paragraph("<b>Total Transmissions:</b>", body_style), str(metrics.get("total_transmissions", 0)),
            Paragraph("<b>Delivery Rate:</b>", body_style), f"{metrics.get('delivery_rate_percent', 100)}%"
        ],
        [
            Paragraph("<b>Packet Loss Rate:</b>", body_style), f"{metrics.get('packet_loss_percent', 0)}%",
            Paragraph("<b>Delayed Transmissions:</b>", body_style), str(metrics.get("delayed_transmissions", 0))
        ],
        [
            Paragraph("<b>Corrupted Transmissions:</b>", body_style), str(metrics.get("corrupted_transmissions", 0)),
            Paragraph("<b>Average Latency:</b>", body_style), f"{metrics.get('average_latency_sec', 0.0)}s"
        ],
        [
            Paragraph("<b>Resilience Tier:</b>", body_style), Paragraph(f"<b>{metrics.get('resilience_tier', 'MODERATE')}</b>", bold_body),
            Paragraph("<b>Verification Discipline:</b>", body_style), f"{dq.get('verification_discipline_rate', 75)}%"
        ]
    ]

    t_metrics = Table(metrics_table_data, colWidths=[130, 130, 140, 140])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f1f5f9")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_metrics)
    story.append(Spacer(1, 10))

    # Decisions Timeline & Mandatory Rationales
    story.append(Paragraph("2. TACTICAL DECISIONS LOG & OPERATIONAL RATIONALES", section_heading))
    if not decisions:
        story.append(Paragraph("<i>No formal command decisions recorded during this session.</i>", body_style))
    else:
        dec_table_data = [
            [
                Paragraph("<b>Role</b>", bold_body),
                Paragraph("<b>Decision Type</b>", bold_body),
                Paragraph("<b>Target Sector</b>", bold_body),
                Paragraph("<b>Conf</b>", bold_body),
                Paragraph("<b>Mandatory Rationale</b>", bold_body)
            ]
        ]
        for d in decisions:
            role = d.get("role", d.get("participant_role", "Commander"))
            d_type = d.get("type", d.get("decision_type", "HOLD"))
            target = d.get("target", d.get("action_target", "Sector Bravo"))
            conf = f"{d.get('confidence', d.get('confidence_score', 75))}%"
            rationale = d.get("rationale", "")

            dec_table_data.append([
                Paragraph(role, body_style),
                Paragraph(f"<b>{d_type}</b>", body_style),
                Paragraph(target, body_style),
                Paragraph(conf, body_style),
                Paragraph(rationale, body_style)
            ])

        t_dec = Table(dec_table_data, colWidths=[80, 95, 95, 40, 230])
        t_dec.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#e2e8f0")),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(t_dec)

    story.append(Spacer(1, 10))

    # AI Cognitive Analysis & Recommendations
    story.append(Paragraph("3. AI PERFORMANCE EVALUATION & TRAINING RECOMMENDATIONS", section_heading))
    ai_analysis = aar_data.get("ai_analysis", {})
    summary_text = ai_analysis.get("summary", "The unit demonstrated sound tactical restraint under communication degradation.")
    story.append(Paragraph(f"<b>Executive Assessment:</b> {summary_text}", body_style))
    story.append(Spacer(1, 4))

    strengths = ai_analysis.get("strengths", ["Cross-verification discipline maintained before advancing"])
    recs = ai_analysis.get("recommendations", ["Establish secondary relay protocol before entering EW zones"])

    ai_table_data = [
        [Paragraph("<b>Observed Strengths:</b>", bold_body), Paragraph("<br/>".join([f"• {s}" for s in strengths]), body_style)],
        [Paragraph("<b>Training Directives:</b>", bold_body), Paragraph("<br/>".join([f"• {r}" for r in recs]), body_style)]
    ]
    t_ai = Table(ai_table_data, colWidths=[120, 420])
    t_ai.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('INNERGRID', (0,0), (-1,-1), 0.5, border_color),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_ai)

    doc.build(story)
    return buffer.getvalue()
