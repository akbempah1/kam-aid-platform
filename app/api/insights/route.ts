import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    const prompt = `You are a financial analyst for KAM AID Pharmacy, a retail pharmacy chain in Ghana with 3 branches. Analyze this monthly financial data and provide actionable insights.

DATA FOR ${data.month} ${data.year}:
- Total Revenue: GHS ${data.totalSales.toLocaleString()}
- Cost of Goods Sold: GHS ${data.cogs.toLocaleString()} (${data.cogsPercent.toFixed(1)}% of revenue)
- Gross Profit: GHS ${data.grossProfit.toLocaleString()} (${data.grossMargin.toFixed(1)}% margin)
- Operating Expenses: GHS ${data.totalExpenses.toLocaleString()} (${data.expensePercent.toFixed(1)}% of revenue)
- Net Profit: GHS ${data.netProfit.toLocaleString()} (${data.netMargin.toFixed(1)}% margin)

BRANCH PERFORMANCE:
${data.branches.map((b: any) => `- ${b.name}: GHS ${b.value.toLocaleString()}`).join("\n")}
- Top performer: ${data.topBranch.name}
- Needs attention: ${data.lowBranch.name}

EXPENSE BREAKDOWN:
${data.expenses.map((e: any) => `- ${e.name}: GHS ${e.amount.toLocaleString()}`).join("\n")}

Provide 3-4 specific, actionable recommendations. Be direct and practical. Focus on:
1. Immediate actions to improve profitability
2. Branch-specific strategies
3. Cost optimization opportunities
4. Growth opportunities

Keep response under 250 words. Use bullet points.`;

    // Check if API key exists
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Anthropic API error:", errorData);
      throw new Error("Failed to get AI response");
    }

    const result = await response.json();
    const insights = result.content[0].text;

    return NextResponse.json({ insights });
  } catch (error) {
    console.error("AI Insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate insights" },
      { status: 500 }
    );
  }
}
