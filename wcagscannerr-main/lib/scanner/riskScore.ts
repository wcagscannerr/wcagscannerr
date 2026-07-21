export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical'
  score: number // 0-100, higher = more risk
  label: string
  color: string
  factors: string[]
}

export function calculateLawsuitRisk(scan: {
  compliance_score: number
  critical_count: number
  serious_count: number
  moderate_count?: number
  minor_count?: number
  big_six: Record<string, number>
  has_overlay_widget?: boolean
}): RiskAssessment {
  let riskScore = 0
  const factors: string[] = []

  // Base risk inversely tied to compliance score
  riskScore += (100 - scan.compliance_score) * 0.5

  // Updated weights: 10 / 6 / 3 / 1 (matching computeScore fail points)
  riskScore += scan.critical_count * 10
  riskScore += scan.serious_count * 6
  riskScore += (scan.moderate_count || 0) * 3
  riskScore += (scan.minor_count || 0) * 1

  if (scan.critical_count > 0) {
    factors.push(`${scan.critical_count} critical violation${scan.critical_count > 1 ? 's' : ''} found — these are the issues plaintiff law firms scan for first`)
  }

  if (scan.serious_count > 0) {
    factors.push(`${scan.serious_count} serious violation${scan.serious_count > 1 ? 's' : ''} found — strong predictor of legal exposure`)
  }

  if ((scan.moderate_count || 0) > 0) {
    factors.push(`${scan.moderate_count} moderate violation${(scan.moderate_count || 0) > 1 ? 's' : ''} found — contributes to cumulative risk`)
  }

  if ((scan.minor_count || 0) > 0) {
    factors.push(`${scan.minor_count} minor violation${(scan.minor_count || 0) > 1 ? 's' : ''} found — adds to overall accessibility debt`)
  }

  // Big Six are responsible for 96% of all documented lawsuits
  const bigSixTotal = Object.values(scan.big_six || {}).reduce((a, b) => a + b, 0)
  if (bigSixTotal > 0) {
    riskScore += bigSixTotal * 3
    factors.push(`${bigSixTotal} "Big Six" violations present — these specific issue types account for 96% of ADA lawsuit filings`)
  }

  if (scan.big_six?.contrast > 0) {
    factors.push('Low color contrast detected — present in 79% of sites that get sued')
  }

  if (scan.has_overlay_widget) {
    riskScore += 15
    factors.push('Overlay widget detected on this site — sites using overlay widgets appeared in 22.6% of all 2025 lawsuits, often BECAUSE of the overlay, not despite it')
  }

  riskScore = Math.min(100, Math.max(0, Math.round(riskScore)))

  let level: RiskAssessment['level']
  let label: string
  let color: string

  if (riskScore >= 70) {
    level = 'critical'
    label = 'Critical Risk'
    color = '#FF3B3B'
  } else if (riskScore >= 45) {
    level = 'high'
    label = 'High Risk'
    color = '#FF7A00'
  } else if (riskScore >= 20) {
    level = 'medium'
    label = 'Medium Risk'
    color = '#FFB800'
  } else {
    level = 'low'
    label = 'Low Risk'
    color = '#22D3A0'
  }

  if (factors.length === 0) {
    factors.push('No major risk factors detected in this scan')
  }

  return { level, score: riskScore, label, color, factors }
}