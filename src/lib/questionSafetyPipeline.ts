// src/lib/questionSafetyPipeline.ts
// ============================================================
// Medical Safety Validation Pipeline for EchoTutor Quiz Mode
//
// Pipeline stages:
//   1. Parse raw AI response → structured object
//   2. Medical accuracy audit (required fields, plausibility)
//   3. Difficulty calibration (verify classification)
//   4. Distractor validation (plausible wrong answers)
//   5. Explanation formatting validation
//   6. Final approval
//
// If any stage fails, the question is rejected and regenerated.
// ============================================================

export interface ValidatedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  clinicalPearl: string;
  domain: string;
  difficulty: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================
// STAGE 1: PARSE RAW RESPONSE
// ============================================================
export function parseRawQuizResponse(rawText: string): Record<string, unknown> {
  if (!rawText || rawText.trim().length === 0) {
    throw new Error("PARSE_FAIL: Empty response from AI.");
  }

  let text = rawText.trim();

  // Strip markdown fences
  text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  // Extract JSON object
  const jsonStart = text.indexOf("{");
  const jsonEnd = text.lastIndexOf("}");

  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("PARSE_FAIL: No JSON object found in response.");
  }

  const jsonString = text.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error(`PARSE_FAIL: Invalid JSON — ${(e as Error).message}`);
  }
}

// ============================================================
// STAGE 2: MEDICAL ACCURACY AUDIT
// ============================================================
function auditMedicalAccuracy(parsed: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!parsed.question || typeof parsed.question !== "string" || (parsed.question as string).length < 20) {
    errors.push("Question text is missing or too short (must be >20 characters).");
  }

  if (!parsed.options || (typeof parsed.options !== "object")) {
    errors.push("Options field is missing or invalid.");
  }

  if (!parsed.correct && parsed.correctAnswer === undefined) {
    errors.push("Correct answer field is missing.");
  }

  if (!parsed.explanation || typeof parsed.explanation !== "string" || (parsed.explanation as string).length < 50) {
    errors.push("Explanation is missing or too short (must be >50 characters).");
  }

  // Validate option count
  if (parsed.options) {
    const optCount = Array.isArray(parsed.options)
      ? (parsed.options as unknown[]).length
      : Object.keys(parsed.options as object).length;
    if (optCount < 4) errors.push(`Only ${optCount} options — need at least 4.`);
    if (optCount < 5) warnings.push("Only 4 options — PTEeXAM uses 5 (A–E).");
  }

  // Check for hallucination red flags
  const questionText = String(parsed.question || "").toLowerCase();
  const explanationText = String(parsed.explanation || "").toLowerCase();

  // Flag if the question references guidelines that don't exist
  const suspiciousGuidelines = ["ase 2023", "ase 2024", "sca 2024", "acc 2025"];
  for (const sg of suspiciousGuidelines) {
    if (questionText.includes(sg) || explanationText.includes(sg)) {
      warnings.push(`Possibly fabricated guideline reference: "${sg}". Verify before use.`);
    }
  }

  // Check clinical pearl exists
  if (!parsed.clinicalPearl && !parsed.clinical_pearl) {
    warnings.push("Clinical pearl is missing.");
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// STAGE 3: DIFFICULTY CALIBRATION
// ============================================================
function calibrateDifficulty(parsed: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const difficulty = String(parsed.difficulty || "Intermediate").toLowerCase();
  const questionText = String(parsed.question || "").toLowerCase();
  const explanationText = String(parsed.explanation || "").toLowerCase();

  // Heuristic: detect question complexity
  const reasoningKeywords = ["best next step", "most appropriate", "you would recommend", "management", "what should", "how would you", "decision", "hemodynamic instability", "post-cpb"];
  const interpretationKeywords = ["most likely", "consistent with", "the finding suggests", "measurement shows", "gradient of", "velocity of", "what does this indicate"];
  const recognitionKeywords = ["which structure", "what is the name", "which view", "normal value", "which of the following is", "where is", "definition of"];

  const hasReasoning = reasoningKeywords.some(k => questionText.includes(k));
  const hasInterpretation = interpretationKeywords.some(k => questionText.includes(k));
  const hasRecognition = recognitionKeywords.some(k => questionText.includes(k));

  let expectedDifficulty = "intermediate";
  if (hasReasoning) expectedDifficulty = "advanced";
  else if (hasInterpretation) expectedDifficulty = "intermediate";
  else if (hasRecognition) expectedDifficulty = "foundation";

  if (difficulty !== expectedDifficulty) {
    warnings.push(
      `Difficulty mismatch: labeled "${difficulty}" but content suggests "${expectedDifficulty}". ` +
      `Recognition→Foundation, Interpretation→Intermediate, Reasoning→Advanced.`
    );
  }

  // Validate difficulty value is one of the allowed values
  const allowed = ["foundation", "intermediate", "advanced"];
  if (!allowed.includes(difficulty)) {
    errors.push(`Invalid difficulty: "${difficulty}". Must be Foundation, Intermediate, or Advanced.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// STAGE 4: DISTRACTOR VALIDATION
// ============================================================
function validateDistractors(parsed: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get options as array of strings
  let optionTexts: string[] = [];

  if (Array.isArray(parsed.options)) {
    optionTexts = (parsed.options as string[]).map(o => String(o).toLowerCase());
  } else if (parsed.options && typeof parsed.options === "object") {
    optionTexts = Object.values(parsed.options as Record<string, string>).map(o => String(o).toLowerCase());
  }

  if (optionTexts.length === 0) return { valid: true, errors, warnings };

  // Check for obviously bad distractors
  for (let i = 0; i < optionTexts.length; i++) {
    const opt = optionTexts[i];

    // Too short (likely not a real answer)
    if (opt.length < 5) {
      warnings.push(`Option ${String.fromCharCode(65 + i)} is suspiciously short: "${opt}".`);
    }

    // "None of the above" / "All of the above" — discouraged in medical education
    if (opt.includes("none of the above") || opt.includes("all of the above")) {
      warnings.push(`Option ${String.fromCharCode(65 + i)} uses "none/all of the above" — discouraged in board-style questions.`);
    }

    // Check for duplicate options
    for (let j = i + 1; j < optionTexts.length; j++) {
      if (opt === optionTexts[j]) {
        errors.push(`Duplicate options: ${String.fromCharCode(65 + i)} and ${String.fromCharCode(65 + j)} are identical.`);
      }
    }
  }

  // Check that options are related (basic coherence check)
  // If the question mentions "TEE" or "echocardiography", at least 3 options should be echo-related
  const questionText = String(parsed.question || "").toLowerCase();
  if (questionText.includes("tee") || questionText.includes("echocardiograph")) {
    const echoKeywords = ["view", "valve", "ventricle", "atrium", "gradient", "velocity", "doppler", "probe", "chamber", "wall", "annul", "leaflet", "regurgit", "stenos", "septum", "vena", "area", "volume", "fraction", "strain", "tapse", "diameter", "dimension"];
    const echoRelated = optionTexts.filter(o => echoKeywords.some(k => o.includes(k)));
    if (echoRelated.length < 3) {
      warnings.push("Less than 3 options appear related to echocardiography. Distractors may be unrelated to the topic.");
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// STAGE 5: EXPLANATION FORMATTING VALIDATION
// ============================================================
function validateExplanationFormatting(parsed: Record<string, unknown>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const explanation = String(parsed.explanation || "");

  if (explanation.length < 100) {
    warnings.push("Explanation is short — should provide detailed rationale for each option.");
  }

  // Check that the explanation discusses the correct answer
  const correctLetter = String(parsed.correct || "A");
  if (!explanation.toLowerCase().includes("correct") && !explanation.toLowerCase().includes(correctLetter.toLowerCase())) {
    warnings.push("Explanation doesn't clearly identify which answer is correct.");
  }

  // Check for option-by-option discussion
  const optionLetters = ["A", "B", "C", "D", "E"];
  let optionsDiscussed = 0;
  for (const letter of optionLetters) {
    // Look for patterns like "Option A is incorrect" or "A is incorrect" or "A."
    const patterns = [
      `option ${letter.toLowerCase()} is`,
      `${letter.toLowerCase()} is incorrect`,
      `${letter.toLowerCase()} is correct`,
    ];
    if (patterns.some(p => explanation.toLowerCase().includes(p))) {
      optionsDiscussed++;
    }
  }

  if (optionsDiscussed < 3) {
    warnings.push(
      `Explanation discusses only ${optionsDiscussed} options individually. ` +
      `Best practice: explain why each option is correct or incorrect.`
    );
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================
// STAGE 6: TRANSFORM TO FRONTEND FORMAT
// ============================================================
function transformToFrontendFormat(parsed: Record<string, unknown>): ValidatedQuizQuestion {
  const letterToIndex: Record<string, number> = { A: 0, B: 1, C: 2, D: 3, E: 4 };

  let options: string[];
  let correctAnswer: number;

  if (parsed.options && typeof parsed.options === "object" && !Array.isArray(parsed.options)) {
    const optionsObj = parsed.options as Record<string, string>;
    options = Object.entries(optionsObj).map(([letter, text]) => `${letter}. ${text}`);
    const correctLetter = typeof parsed.correct === "string" ? parsed.correct.trim().toUpperCase() : "A";
    correctAnswer = letterToIndex[correctLetter] ?? 0;
  } else if (Array.isArray(parsed.options)) {
    options = (parsed.options as string[]).map(o => String(o));
    if (typeof parsed.correctAnswer === "number") {
      correctAnswer = parsed.correctAnswer;
    } else if (typeof parsed.correct === "string") {
      correctAnswer = letterToIndex[parsed.correct.trim().toUpperCase()] ?? 0;
    } else {
      correctAnswer = 0;
    }
  } else {
    throw new Error("TRANSFORM_FAIL: No valid options format.");
  }

  if (correctAnswer < 0 || correctAnswer >= options.length) {
    correctAnswer = 0;
  }

  return {
    question: String(parsed.question || "Question text missing."),
    options,
    correctAnswer,
    explanation: String(parsed.explanation || "No explanation provided."),
    clinicalPearl: String(parsed.clinicalPearl || parsed.clinical_pearl || "No clinical pearl available."),
    domain: String(parsed.domain || "General"),
    difficulty: String(parsed.difficulty || "Intermediate"),
  };
}

// ============================================================
// MAIN PIPELINE
// ============================================================
export interface PipelineResult {
  question: ValidatedQuizQuestion | null;
  passed: boolean;
  errors: string[];
  warnings: string[];
  stages: { name: string; passed: boolean; errors: string[]; warnings: string[] }[];
}

export function runSafetyPipeline(rawText: string): PipelineResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];
  const stages: PipelineResult["stages"] = [];

  // Stage 1: Parse
  let parsed: Record<string, unknown>;
  try {
    parsed = parseRawQuizResponse(rawText);
    stages.push({ name: "Parse", passed: true, errors: [], warnings: [] });
  } catch (e) {
    const msg = (e as Error).message;
    stages.push({ name: "Parse", passed: false, errors: [msg], warnings: [] });
    return { question: null, passed: false, errors: [msg], warnings: [], stages };
  }

  // Stage 2: Medical accuracy audit
  const medicalResult = auditMedicalAccuracy(parsed);
  stages.push({ name: "Medical Accuracy", passed: medicalResult.valid, errors: medicalResult.errors, warnings: medicalResult.warnings });
  allErrors.push(...medicalResult.errors);
  allWarnings.push(...medicalResult.warnings);

  // Stage 3: Difficulty calibration
  const difficultyResult = calibrateDifficulty(parsed);
  stages.push({ name: "Difficulty Calibration", passed: difficultyResult.valid, errors: difficultyResult.errors, warnings: difficultyResult.warnings });
  allErrors.push(...difficultyResult.errors);
  allWarnings.push(...difficultyResult.warnings);

  // Stage 4: Distractor validation
  const distractorResult = validateDistractors(parsed);
  stages.push({ name: "Distractor Validation", passed: distractorResult.valid, errors: distractorResult.errors, warnings: distractorResult.warnings });
  allErrors.push(...distractorResult.errors);
  allWarnings.push(...distractorResult.warnings);

  // Stage 5: Explanation formatting
  const explanationResult = validateExplanationFormatting(parsed);
  stages.push({ name: "Explanation Formatting", passed: explanationResult.valid, errors: explanationResult.errors, warnings: explanationResult.warnings });
  allErrors.push(...explanationResult.errors);
  allWarnings.push(...explanationResult.warnings);

  // If any stage has errors (not warnings), reject
  if (allErrors.length > 0) {
    return { question: null, passed: false, errors: allErrors, warnings: allWarnings, stages };
  }

  // Stage 6: Transform
  let question: ValidatedQuizQuestion;
  try {
    question = transformToFrontendFormat(parsed);
    stages.push({ name: "Transform", passed: true, errors: [], warnings: [] });
  } catch (e) {
    const msg = (e as Error).message;
    stages.push({ name: "Transform", passed: false, errors: [msg], warnings: [] });
    return { question: null, passed: false, errors: [msg], warnings: allWarnings, stages };
  }

  // Log warnings for monitoring
  if (allWarnings.length > 0) {
    console.warn(`[SafetyPipeline] ${allWarnings.length} warning(s):`, allWarnings);
  }

  return { question, passed: true, errors: [], warnings: allWarnings, stages };
}