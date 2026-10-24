import type {
  AnswersMap,
  AnswerValue,
  FillSegment,
  GradeResult,
  MatchItem,
  OrderItem,
  PublicQuestion,
  PublicSection,
  PublicWorksheet,
  QuestionResult,
} from "./worksheet-types";

/* ------------------------------------------------------------------ */
/*  تعريف الأسئلة (مع مفاتيح الإجابة — تبقى على الخادم فقط)            */
/*  التصحيح إلكتروني كامل 100% — المجموع 20 درجة                       */
/* ------------------------------------------------------------------ */

interface McqQ {
  id: string;
  type: "mcq";
  points: number;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface TfQ {
  id: string;
  type: "truefalse";
  points: number;
  prompt: string;
  answer: boolean;
  explanation: string;
}

interface MatchQ {
  id: string;
  type: "matching";
  points: number;
  prompt: string;
  hint?: string;
  left: MatchItem[];
  right: MatchItem[];
  answer: Record<string, string>;
  explanation: string;
}

interface OrderQ {
  id: string;
  type: "ordering";
  points: number;
  prompt: string;
  hint?: string;
  items: OrderItem[];
  answer: string[];
  explanation: string;
}

interface FillQ {
  id: string;
  type: "fill";
  points: number;
  prompt: string;
  hint?: string;
  segments: FillSegment[];
  bank: string[];
  answer: Record<string, string>;
  explanation: string;
}

type Question = McqQ | TfQ | MatchQ | OrderQ | FillQ;

interface Section {
  id: string;
  order: string;
  title: string;
  instruction: string;
  icon: string;
  questions: Question[];
}

const SECTIONS: Section[] = [
  {
    id: "s1",
    order: "السؤال الأول",
    title: "اختر الإجابة الصحيحة",
    instruction: "اختر الإجابة الصحيحة من بين البدائل التالية بالنقر عليها (لكل فقرة درجة واحدة).",
    icon: "✅",
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 1,
        prompt: "مؤسّس الدولة السعودية الثانية هو الإمام:",
        options: [
          "محمد بن سعود",
          "تركي بن عبدالله بن محمد بن سعود",
          "عبدالله بن فيصل",
          "عبدالرحمن بن فيصل",
        ],
        answer: 1,
        explanation:
          "الإمام تركي بن عبدالله بن محمد بن سعود هو مؤسّس الدولة السعودية الثانية وإمامها الأول.",
      },
      {
        id: "q2",
        type: "mcq",
        points: 1,
        prompt: "أُعيد تأسيس الدولة السعودية في دورها الثاني عام:",
        options: ["1139هـ", "1240هـ", "1309هـ", "1351هـ"],
        answer: 1,
        explanation: "تمّ إعادة تأسيس الدولة السعودية في دورها الثاني عام 1240هـ.",
      },
      {
        id: "q3",
        type: "mcq",
        points: 1,
        prompt: "عاصمة الدولة السعودية الثانية هي مدينة:",
        options: ["الدرعية", "الرياض", "الأحساء", "الطائف"],
        answer: 1,
        explanation:
          "أصبحت الرياض عاصمة للدولة السعودية الثانية عام 1240هـ، وهي مدينة تاريخية عريقة.",
      },
      {
        id: "q4",
        type: "mcq",
        points: 1,
        prompt: "المدة الزمنية بين سقوط الدرعية وتأسيس الدولة السعودية الثانية:",
        options: ["ثلاث سنوات", "خمس سنوات", "سبع سنوات", "عشر سنوات"],
        answer: 2,
        explanation:
          "بعد سبع سنوات فقط من سقوط الدرعية استطاع الإمام تركي بن عبدالله استرجاع الدولة.",
      },
      {
        id: "q5",
        type: "mcq",
        points: 1,
        prompt: "اشتهر الإمام تركي بن عبدالله بشجاعته وبسيفه المسمّى:",
        options: ["الأجرب", "البتّار", "الصمصام", "ذو الفقار"],
        answer: 0,
        explanation: "من صفات شجاعته: قيادته للمعارك واشتهاره بسيفه المسمّى بـ(الأجرب).",
      },
      {
        id: "q6",
        type: "mcq",
        points: 1,
        prompt: "تولّى الحكم بعد وفاة الإمام تركي بن عبدالله عام 1249هـ:",
        options: [
          "الإمام فيصل بن تركي",
          "الإمام عبدالله بن فيصل",
          "الإمام عبدالرحمن بن فيصل",
          "الملك عبدالعزيز",
        ],
        answer: 0,
        explanation:
          "تُوفّي الإمام تركي بن عبدالله عام 1249هـ، وتولّى الحكم بعده ابنه الإمام فيصل بن تركي.",
      },
    ],
  },
  {
    id: "s2",
    order: "السؤال الثاني",
    title: "ضع علامة صح أو خطأ",
    instruction: "اقرأ العبارة ثم اختر (صح) إذا كانت صحيحة أو (خطأ) إذا كانت غير صحيحة.",
    icon: "⚖️",
    questions: [
      {
        id: "q7",
        type: "truefalse",
        points: 1,
        prompt: "بعد سقوط الدرعية دُمِّرت المدينة وأُحرقت المزارع والمحصولات وانتشرت الفوضى.",
        answer: true,
        explanation:
          "من آثار سقوط الدرعية: تدمير المدينة، وحرق المزارع والمحصولات والكتب، وانتشار الفوضى بسبب غياب الدولة.",
      },
      {
        id: "q8",
        type: "truefalse",
        points: 1,
        prompt:
          "الإمام تركي بن عبدالله هو والد الملك عبدالعزيز مؤسّس المملكة العربية السعودية.",
        answer: false,
        explanation:
          "العبارة خاطئة؛ فالإمام تركي بن عبدالله هو جدّ الملك عبدالعزيز وليس والده.",
      },
      {
        id: "q9",
        type: "truefalse",
        points: 1,
        prompt:
          "استعمل الإمام تركي أسلوب المواجهة المباشرة فقط ولم يستخدم أي أسلوب آخر مع أعدائه.",
        answer: false,
        explanation:
          "العبارة خاطئة؛ فقد كان متميّزاً في التخطيط، يستعمل المواجهة المباشرة حيناً وسياسة الاختباء أحياناً أخرى.",
      },
      {
        id: "q10",
        type: "truefalse",
        points: 1,
        prompt: "أعاد الإمام تركي للرياض دورها التاريخي فبنى أسوارها وقصر الحكم ومسجداً جامعاً.",
        answer: true,
        explanation:
          "بعد استرجاع الرياض بنى الإمام تركي أسوارها وقصر الحكم وبنى مسجداً جامعاً كبيراً بجواره.",
      },
      {
        id: "q11",
        type: "truefalse",
        points: 1,
        prompt:
          "يُعدّ الإمام تركي بن عبدالله من أحفاد الإمام محمد بن سعود مؤسس الدولة السعودية الأولى.",
        answer: true,
        explanation:
          "العبارة صحيحة؛ فهو الإمام تركي بن عبدالله بن محمد بن سعود، من أحفاد مؤسس الدولة السعودية الأولى.",
      },
    ],
  },
  {
    id: "s3",
    order: "السؤال الثالث",
    title: "وصّل الصفة بما يدلّ عليها",
    instruction:
      "اختر من القائمة المنسدلة الوصف المناسب لكل صفة من صفات الإمام تركي بن عبدالله (لكل توصيل صحيح درجة).",
    icon: "🔗",
    questions: [
      {
        id: "q12",
        type: "matching",
        points: 4,
        prompt: "صفات الإمام تركي بن عبدالله رحمه الله",
        hint: "استعن بمخطط (صفات الإمام تركي بن عبدالله) في كتابك صفحة ٥٨.",
        left: [
          { id: "l1", text: "الإيمان" },
          { id: "l2", text: "التخطيط" },
          { id: "l3", text: "الشجاعة" },
          { id: "l4", text: "العدل" },
        ],
        right: [
          { id: "r1", text: "قيادة المعارك واشتهاره بسيفه المسمّى بالأجرب" },
          { id: "r2", text: "الثقة بالله وإخلاص العمل له" },
          { id: "r3", text: "حرصه على مصالح المواطنين والعدل بينهم" },
          { id: "r4", text: "وضع خطط محكمة لمواجهة التحديات" },
        ],
        answer: { l1: "r2", l2: "r4", l3: "r1", l4: "r3" },
        explanation:
          "الإيمان: الثقة بالله وإخلاص العمل له — التخطيط: وضع خطط محكمة — الشجاعة: قيادة المعارك وسيفه الأجرب — العدل: الحرص على مصالح المواطنين.",
      },
    ],
  },
  {
    id: "s4",
    order: "السؤال الرابع",
    title: "رتّب أئمة الدولة السعودية الثانية",
    instruction:
      "انقر على أسماء الأئمة بالترتيب الزمني الصحيح من الأقدم إلى الأحدث (درجتان للترتيب الصحيح).",
    icon: "⏳",
    questions: [
      {
        id: "q13",
        type: "ordering",
        points: 2,
        prompt: "أئمة الدولة السعودية الثانية حسب تسلسل حكمهم",
        hint: "استعن بخط الزمن في صفحة ٥٧ من كتابك.",
        items: [
          { id: "o1", text: "الإمام عبدالله بن فيصل", caption: "1282 - 1307هـ" },
          { id: "o2", text: "الإمام تركي بن عبدالله", caption: "1240 - 1249هـ" },
          { id: "o3", text: "الإمام عبدالرحمن بن فيصل", caption: "1307 - 1309هـ" },
          { id: "o4", text: "الإمام فيصل بن تركي", caption: "1249 - 1282هـ" },
        ],
        answer: ["o2", "o4", "o1", "o3"],
        explanation:
          "الترتيب الصحيح: الإمام تركي بن عبدالله ← الإمام فيصل بن تركي ← الإمام عبدالله بن فيصل ← الإمام عبدالرحمن بن فيصل.",
      },
    ],
  },
  {
    id: "s5",
    order: "السؤال الخامس",
    title: "أكمل الفراغ من بنك الكلمات",
    instruction:
      "انقر على الكلمة المناسبة من بنك الكلمات لوضعها في الفراغ، وانقر على الفراغ لإزالتها (لكل فراغ درجة).",
    icon: "✏️",
    questions: [
      {
        id: "q14",
        type: "fill",
        points: 3,
        prompt: "أكمل الفقرة التالية بالكلمات المناسبة:",
        hint: "انتبه؛ يوجد في بنك الكلمات كلمات زائدة لا تُستخدم.",
        segments: [
          { kind: "text", value: "نجا الإمام تركي بن عبدالله من الأعداء بعد أن شارك في الدفاع عن" },
          { kind: "blank", id: "b1" },
          {
            kind: "text",
            value: "، ثم تمكّن من محاصرة مدينة الرياض وطرد الحامية",
          },
          { kind: "blank", id: "b2" },
          {
            kind: "text",
            value: "المعتدية، وأعاد للرياض دورها التاريخي فبنى أسوارها وبنى",
          },
          { kind: "blank", id: "b3" },
          { kind: "text", value: "ومسجداً جامعاً كبيراً بجواره." },
        ],
        bank: ["الدرعية", "العثمانية", "قصر الحكم", "الأحساء", "البرتغالية", "سوق المدينة"],
        answer: { b1: "الدرعية", b2: "العثمانية", b3: "قصر الحكم" },
        explanation:
          "الدفاع عن (الدرعية) — طرد الحامية (العثمانية) — وبنى (قصر الحكم) ومسجداً جامعاً بجواره.",
      },
    ],
  },
];

export const WORKSHEET_META = {
  subject: "الدراسات الاجتماعية",
  grade: "الصف السادس الابتدائي",
  classroom: "6/2",
  unit: "الوحدة الثالثة",
  lesson: "الدرس السابع: تأسيس الدولة السعودية الثانية",
  term: "الفصل الدراسي الأول",
  objectives: [
    "أن يُعدّد الطالب نتائج سقوط الدرعية.",
    "أن يُحدّد مؤسّس الدولة السعودية الثانية وعاصمتها وسنة تأسيسها.",
    "أن يستنتج أسباب عودة الدولة السعودية مرة ثانية.",
    "أن يُبيّن صفات الإمام تركي بن عبدالله رحمه الله.",
    "أن يُرتّب أئمة الدولة السعودية الثانية ترتيباً زمنياً.",
  ],
};

export const MAX_SCORE = SECTIONS.reduce(
  (total, section) => total + section.questions.reduce((s, q) => s + q.points, 0),
  0,
);

/* ------------------------------------------------------------------ */
/*  نسخة عامة للمتصفح بدون مفاتيح الإجابة                              */
/* ------------------------------------------------------------------ */

function toPublicQuestion(q: Question): PublicQuestion {
  switch (q.type) {
    case "mcq":
      return {
        id: q.id,
        type: "mcq",
        points: q.points,
        prompt: q.prompt,
        options: q.options,
      };
    case "truefalse":
      return { id: q.id, type: "truefalse", points: q.points, prompt: q.prompt };
    case "matching":
      return {
        id: q.id,
        type: "matching",
        points: q.points,
        prompt: q.prompt,
        hint: q.hint,
        left: q.left,
        right: q.right,
      };
    case "ordering":
      return {
        id: q.id,
        type: "ordering",
        points: q.points,
        prompt: q.prompt,
        hint: q.hint,
        items: q.items,
      };
    case "fill":
      return {
        id: q.id,
        type: "fill",
        points: q.points,
        prompt: q.prompt,
        hint: q.hint,
        segments: q.segments,
        bank: q.bank,
      };
  }
}

export function getPublicWorksheet(): PublicWorksheet {
  const sections: PublicSection[] = SECTIONS.map((section) => ({
    id: section.id,
    order: section.order,
    title: section.title,
    instruction: section.instruction,
    icon: section.icon,
    points: section.questions.reduce((s, q) => s + q.points, 0),
    questions: section.questions.map(toPublicQuestion),
  }));

  return {
    ...WORKSHEET_META,
    maxScore: MAX_SCORE,
    sections,
  };
}

/* ------------------------------------------------------------------ */
/*  التصحيح الإلكتروني الكامل على الخادم                               */
/* ------------------------------------------------------------------ */

function normalize(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0621-\u063A\u0641-\u064A0-9a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function gradeSubmission(answers: AnswersMap): GradeResult {
  const breakdown: QuestionResult[] = [];
  let totalScore = 0;
  let correctCount = 0;
  let questionCount = 0;

  for (const section of SECTIONS) {
    for (const q of section.questions) {
      questionCount += 1;
      const given: AnswerValue | undefined = answers[q.id];
      let earned = 0;
      let correct = false;
      let studentAnswerText = "لم يُجب";
      let correctAnswerText = "";

      if (q.type === "mcq") {
        const idx = given && given.type === "mcq" ? given.value : null;
        correctAnswerText = q.options[q.answer];
        if (typeof idx === "number" && q.options[idx] !== undefined) {
          studentAnswerText = q.options[idx];
          correct = idx === q.answer;
        }
        earned = correct ? q.points : 0;
      } else if (q.type === "truefalse") {
        const val = given && given.type === "truefalse" ? given.value : null;
        correctAnswerText = q.answer ? "صح ✔" : "خطأ ✘";
        if (typeof val === "boolean") {
          studentAnswerText = val ? "صح ✔" : "خطأ ✘";
          correct = val === q.answer;
        }
        earned = correct ? q.points : 0;
      } else if (q.type === "matching") {
        const map = given && given.type === "matching" ? given.value : {};
        const rightText = new Map(q.right.map((r) => [r.id, r.text]));
        let hits = 0;
        const studentParts: string[] = [];
        const correctParts: string[] = [];
        for (const left of q.left) {
          const chosen = map?.[left.id];
          if (chosen && chosen === q.answer[left.id]) hits += 1;
          studentParts.push(
            `${left.text} ← ${chosen ? rightText.get(chosen) ?? "—" : "لم يُوصَّل"}`,
          );
          correctParts.push(`${left.text} ← ${rightText.get(q.answer[left.id]) ?? ""}`);
        }
        earned = hits;
        correct = hits === q.left.length;
        studentAnswerText = studentParts.join(" | ");
        correctAnswerText = correctParts.join(" | ");
      } else if (q.type === "ordering") {
        const order = given && given.type === "ordering" ? given.value : [];
        const itemText = new Map(q.items.map((i) => [i.id, i.text]));
        let hits = 0;
        q.answer.forEach((id, index) => {
          if (order[index] === id) hits += 1;
        });
        correct = hits === q.answer.length;
        earned = correct ? q.points : hits >= Math.ceil(q.answer.length / 2) ? 1 : 0;
        studentAnswerText = order.length
          ? order.map((id, i) => `${i + 1}- ${itemText.get(id) ?? "?"}`).join(" ، ")
          : "لم يُجب";
        correctAnswerText = q.answer.map((id, i) => `${i + 1}- ${itemText.get(id)}`).join(" ، ");
      } else {
        // fill
        const map = given && given.type === "fill" ? given.value : {};
        const blanks = Object.keys(q.answer);
        let hits = 0;
        const studentParts: string[] = [];
        blanks.forEach((blankId, index) => {
          const chosen = map?.[blankId] ?? "";
          if (normalize(chosen) === normalize(q.answer[blankId])) hits += 1;
          studentParts.push(`(${index + 1}) ${chosen || "فراغ"}`);
        });
        earned = hits;
        correct = hits === blanks.length;
        studentAnswerText = studentParts.join(" ، ");
        correctAnswerText = blanks
          .map((b, i) => `(${i + 1}) ${q.answer[b]}`)
          .join(" ، ");
      }

      totalScore += earned;
      if (correct) correctCount += 1;

      breakdown.push({
        questionId: q.id,
        sectionId: section.id,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        earned,
        correct,
        studentAnswerText,
        correctAnswerText,
        explanation: q.explanation,
      });
    }
  }

  return {
    breakdown,
    totalScore,
    maxScore: MAX_SCORE,
    correctCount,
    questionCount,
  };
}
