import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import fingerprintAsset from "./assets/fingerprint.webp";
import sealAsset from "./assets/seal.webp";
import { Logo } from "./components/Logo";
import "./App.css";

GlobalWorkerOptions.workerSrc = workerSrc;

type Choice = "可接受" | "不可接受" | "需讨论";
type AgreementStatus = "草拟中" | "生效中" | "已终止";
type SigningPhase = "idle" | "pressing" | "scanning" | "done";

interface ScopeItem {
  id: string;
  text: string;
  choice: Choice;
}

interface ScopeSection {
  id:
    | "powerStructure"
    | "psychologicalControl"
    | "lightHumiliation"
    | "remoteInstructions";
  title: string;
  description: string;
  items: ScopeItem[];
}

interface ContractData {
  domName: string;
  subName: string;
  domToSubTitles: string[];
  subToDomTitles: string[];
  startDate: string;
  endDate: string;
  agreementStatus: AgreementStatus;
  isLocked: boolean;
  renewalCount: number;
  adulthoodConfirmed: boolean;
  saneConfirmed: boolean;
  consentConfirmed: boolean;
  canTerminateAnytime: boolean;
  onlineOnlyConfirmed: boolean;
  noOfflineInterferenceConfirmed: boolean;
  yellowSafeWord: string;
  redSafeWord: string;
  domCommitNoPsychHarm: boolean;
  domCommitNoRealThreat: boolean;
  domCommitNoIndependenceLoss: boolean;
  aftercareDailyReview: boolean;
  aftercareEmotionCheck: boolean;
  aftercareSafetyFirst: boolean;
  terminationByEitherParty: boolean;
  terminationByTrustBreak: boolean;
  terminationByForbiddenViolation: boolean;
  terminationByTimeout: boolean;
  forbiddenItems: string[];
  scopeSections: ScopeSection[];
  extraNotes: string;
}

const STORAGE_KEY = "bdsm_contract_data_v2";
const TOKEN_PREFIX = "BDSM_CONTRACT_TOKEN:";
const CHOICE_OPTIONS: Choice[] = ["可接受", "不可接受", "需讨论"];
const AGREEMENT_TEMPLATE_SECTIONS: Array<{ title: string; lines: string[] }> = [
  {
    title: "协议性质与期限",
    lines: [
      "本协议为临时的试用性质线上主奴关系。",
      "协议期限为双方确认起 72 小时，仅适用于线上互动。",
      "明确禁止开盒、人肉、线下见面要求、现实社交干涉等行为。",
    ],
  },
  {
    title: "前提声明",
    lines: [
      "双方均为成年人，且在理智清醒状态下签订本协议。",
      "BDSM 属于自愿角色互动，不等同于现实法律关系。",
      "协议建立于安全 / 理智 / 知情同意原则之上。",
      "任一方可在任何时间撤回同意并终止协议。",
    ],
  },
  {
    title: "关系定义",
    lines: [
      "Sub 在约定范围内服从 Dom 的调教与规则安排。",
      "Dom 尊重 Sub 人格尊严与心理安全。",
      "本关系不代表现实所有权、经济控制或人格控制。",
      "Dom 承诺不利用情感依附制造心理伤害，不以现实威胁控制，不剥夺现实独立性。",
    ],
  },
  {
    title: "玩法范畴与禁止项",
    lines: [
      "玩法范畴需逐项确认：可接受 / 不可接受 / 需讨论。",
      "明确禁止：身体损伤、永久痕迹、肮脏玩法、年龄扮演、现实暴露风险、非自愿录音录像、威胁隐私。",
      "遇到未列明或定义不清玩法，必须暂停并再次明确确认后才可继续。",
    ],
  },
  {
    title: "安全词、事后照顾与终止",
    lines: [
      "黄色安全词表示不适并需减缓调整；红色安全词表示立即停止。",
      "Aftercare 包括每日复盘、情绪稳定确认、心理安全优先处理。",
      "任一方主动终止、信任破坏、违反禁止范畴、超过 72 小时未续约均可触发终止。",
    ],
  },
  {
    title: "补充条款",
    lines: [
      "本协议为临时协议，不具法律效力。",
      "协议到期后恢复普通平等交流关系；如需延续，需重新签署新协议。",
    ],
  },
];

function createDefaultScopeSections(): ScopeSection[] {
  return [
    {
      id: "powerStructure",
      title: "权力结构类",
      description: "围绕称呼、任务、时间与奖惩机制进行结构化约定（不羞辱人格）",
      items: [
        {
          id: crypto.randomUUID(),
          text: "日常线上行为规范（称呼、汇报制度）",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "指定任务与完成汇报",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "时间管理与轻度行为约束",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "奖惩机制（非羞辱人格）",
          choice: "需讨论",
        },
      ],
    },
    {
      id: "psychologicalControl",
      title: "心理控制类（非精神伤害）",
      description: "保持心理安全前提下进行语境、情绪与服从训练互动",
      items: [
        {
          id: crypto.randomUUID(),
          text: "轻度心理压迫语境（双方可控范围）",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "角色扮演中的支配语气",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "情绪引导与服从训练",
          choice: "需讨论",
        },
      ],
    },
    {
      id: "lightHumiliation",
      title: "轻度羞辱类（非人格贬损）",
      description: "限定为角色内表达，不触及真实人格贬损与现实羞辱",
      items: [
        { id: crypto.randomUUID(), text: "角色内羞辱", choice: "需讨论" },
        {
          id: crypto.randomUUID(),
          text: "控制语境下的身份弱化表达",
          choice: "需讨论",
        },
      ],
    },
    {
      id: "remoteInstructions",
      title: "远程指令类",
      description: "仅限非危险、私密、安全前提下的在线指令互动",
      items: [
        {
          id: crypto.randomUUID(),
          text: "指定行为任务（非危险）",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "着装/姿态安排（不涉公开暴露风险）",
          choice: "需讨论",
        },
        {
          id: crypto.randomUUID(),
          text: "线上展示（私密安全前提 + Sub 单次同意）",
          choice: "需讨论",
        },
      ],
    },
  ];
}

function toBase64(buffer: Uint8Array): string {
  let binary = "";
  buffer.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function toArrayBuffer(input: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(input.length);
  copy.set(input);
  return copy.buffer;
}

async function deriveAesKey(
  password: string,
  salt: Uint8Array,
): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(new TextEncoder().encode(password)),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations: 160000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptWithPassword(
  plainText: string,
  password: string,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveAesKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(new TextEncoder().encode(plainText)),
  );
  return `v1.${toBase64(salt)}.${toBase64(iv)}.${toBase64(new Uint8Array(encrypted))}`;
}

async function decryptWithPassword(
  payload: string,
  password: string,
): Promise<string> {
  const [version, saltBase64, ivBase64, cipherBase64] = payload.split(".");
  if (version !== "v1" || !saltBase64 || !ivBase64 || !cipherBase64) {
    throw new Error("密文格式错误");
  }

  const salt = fromBase64(saltBase64);
  const iv = fromBase64(ivBase64);
  const cipherBytes = fromBase64(cipherBase64);
  const key = await deriveAesKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(cipherBytes),
  );

  return new TextDecoder().decode(decrypted);
}

function formatDateTimeInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function yesNo(value: boolean): string {
  return value ? "是" : "否";
}

function createDefaultContractData(): ContractData {
  const start = new Date();
  const end = new Date(start.getTime() + 72 * 60 * 60 * 1000);
  return {
    domName: "",
    subName: "",
    domToSubTitles: [],
    subToDomTitles: [],
    startDate: formatDateTimeInput(start),
    endDate: formatDateTimeInput(end),
    agreementStatus: "草拟中",
    isLocked: false,
    renewalCount: 0,
    adulthoodConfirmed: false,
    saneConfirmed: false,
    consentConfirmed: false,
    canTerminateAnytime: false,
    onlineOnlyConfirmed: false,
    noOfflineInterferenceConfirmed: false,
    yellowSafeWord: "",
    redSafeWord: "",
    domCommitNoPsychHarm: true,
    domCommitNoRealThreat: true,
    domCommitNoIndependenceLoss: true,
    aftercareDailyReview: true,
    aftercareEmotionCheck: true,
    aftercareSafetyFirst: true,
    terminationByEitherParty: true,
    terminationByTrustBreak: true,
    terminationByForbiddenViolation: true,
    terminationByTimeout: true,
    forbiddenItems: [
      "任何造成身体损伤的行为",
      "任何可能留下永久性痕迹的行为",
      "任何肮脏玩法（包括排泄物相关）",
      "年龄扮演",
      "具有现实暴露风险的行为（公共暴露/高风险暴露）",
      "非自愿录音录像",
      "威胁现实身份或隐私",
      "开盒、人肉、线下见面要求、现实社交干涉",
    ],
    scopeSections: createDefaultScopeSections(),
    extraNotes: "",
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNonNegativeNumber(value: unknown, fallback = 0): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeChoice(value: unknown, fallback: Choice = "需讨论"): Choice {
  if (
    value === "可接受" ||
    value === "不可接受" ||
    value === "需讨论"
  ) {
    return value;
  }
  return fallback;
}

function normalizeAgreementStatus(
  value: unknown,
  fallback: AgreementStatus,
): AgreementStatus {
  if (value === "草拟中" || value === "生效中" || value === "已终止") {
    return value;
  }
  return fallback;
}

function normalizeScopeSections(value: unknown, fallback: ScopeSection[]): ScopeSection[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const incomingMap = new Map<ScopeSection["id"], Record<string, unknown>>();
  value.forEach((item) => {
    const rec = asRecord(item);
    if (!rec) {
      return;
    }
    const id = rec?.id;
    if (
      id === "powerStructure" ||
      id === "psychologicalControl" ||
      id === "lightHumiliation" ||
      id === "remoteInstructions"
    ) {
      incomingMap.set(id, rec);
    }
  });

  return fallback.map((defaultSection) => {
    const incoming = incomingMap.get(defaultSection.id);
    if (!incoming) {
      return defaultSection;
    }
    const rawItems = Array.isArray(incoming.items) ? incoming.items : [];
    const normalizedItems: ScopeItem[] = rawItems
      .map((rawItem) => {
        const item = asRecord(rawItem);
        if (!item) {
          return null;
        }
        const text = asString(item.text).trim();
        if (!text) {
          return null;
        }
        return {
          id:
            typeof item.id === "string" && item.id.trim()
              ? item.id
              : crypto.randomUUID(),
          text,
          choice: normalizeChoice(item.choice),
        };
      })
      .filter((item): item is ScopeItem => item !== null);

    return {
      ...defaultSection,
      title: asString(incoming.title, defaultSection.title),
      description: asString(incoming.description, defaultSection.description),
      items: normalizedItems.length > 0 ? normalizedItems : defaultSection.items,
    };
  });
}

function normalizeContractData(raw: unknown): ContractData {
  const defaults = createDefaultContractData();
  const data = asRecord(raw);
  if (!data) {
    return defaults;
  }

  const legacyMutualTitles = normalizeStringArray(data.mutualTitles);
  const domToSubTitles = normalizeStringArray(data.domToSubTitles);
  const subToDomTitles = normalizeStringArray(data.subToDomTitles);

  return {
    ...defaults,
    domName: asString(data.domName, defaults.domName),
    subName: asString(data.subName, defaults.subName),
    domToSubTitles:
      domToSubTitles.length > 0 ? domToSubTitles : legacyMutualTitles,
    subToDomTitles:
      subToDomTitles.length > 0 ? subToDomTitles : legacyMutualTitles,
    startDate: asString(data.startDate, defaults.startDate),
    endDate: asString(data.endDate, defaults.endDate),
    agreementStatus: normalizeAgreementStatus(
      data.agreementStatus,
      defaults.agreementStatus,
    ),
    isLocked: asBoolean(data.isLocked, defaults.isLocked),
    renewalCount: asNonNegativeNumber(data.renewalCount, defaults.renewalCount),
    adulthoodConfirmed: asBoolean(
      data.adulthoodConfirmed,
      defaults.adulthoodConfirmed,
    ),
    saneConfirmed: asBoolean(data.saneConfirmed, defaults.saneConfirmed),
    consentConfirmed: asBoolean(data.consentConfirmed, defaults.consentConfirmed),
    canTerminateAnytime: asBoolean(
      data.canTerminateAnytime,
      defaults.canTerminateAnytime,
    ),
    onlineOnlyConfirmed: asBoolean(
      data.onlineOnlyConfirmed,
      defaults.onlineOnlyConfirmed,
    ),
    noOfflineInterferenceConfirmed: asBoolean(
      data.noOfflineInterferenceConfirmed,
      defaults.noOfflineInterferenceConfirmed,
    ),
    yellowSafeWord: asString(data.yellowSafeWord, defaults.yellowSafeWord),
    redSafeWord: asString(data.redSafeWord, defaults.redSafeWord),
    domCommitNoPsychHarm: asBoolean(
      data.domCommitNoPsychHarm,
      defaults.domCommitNoPsychHarm,
    ),
    domCommitNoRealThreat: asBoolean(
      data.domCommitNoRealThreat,
      defaults.domCommitNoRealThreat,
    ),
    domCommitNoIndependenceLoss: asBoolean(
      data.domCommitNoIndependenceLoss,
      defaults.domCommitNoIndependenceLoss,
    ),
    aftercareDailyReview: asBoolean(
      data.aftercareDailyReview,
      defaults.aftercareDailyReview,
    ),
    aftercareEmotionCheck: asBoolean(
      data.aftercareEmotionCheck,
      defaults.aftercareEmotionCheck,
    ),
    aftercareSafetyFirst: asBoolean(
      data.aftercareSafetyFirst,
      defaults.aftercareSafetyFirst,
    ),
    terminationByEitherParty: asBoolean(
      data.terminationByEitherParty,
      defaults.terminationByEitherParty,
    ),
    terminationByTrustBreak: asBoolean(
      data.terminationByTrustBreak,
      defaults.terminationByTrustBreak,
    ),
    terminationByForbiddenViolation: asBoolean(
      data.terminationByForbiddenViolation,
      defaults.terminationByForbiddenViolation,
    ),
    terminationByTimeout: asBoolean(
      data.terminationByTimeout,
      defaults.terminationByTimeout,
    ),
    forbiddenItems: normalizeStringArray(data.forbiddenItems).length
      ? normalizeStringArray(data.forbiddenItems)
      : defaults.forbiddenItems,
    scopeSections: normalizeScopeSections(data.scopeSections, defaults.scopeSections),
    extraNotes: asString(data.extraNotes, defaults.extraNotes),
  };
}

interface CustomSelectProps {
  value: Choice;
  onChange: (value: Choice) => void;
  disabled?: boolean;
}

function CustomSelect({
  value,
  onChange,
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`custom-select ${disabled ? "disabled" : ""}`}
      tabIndex={disabled ? -1 : 0}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
          }
        }}
      >
        <span>{value}</span>
        <span className="chevron">{open ? "▲" : "▼"}</span>
      </button>
      {open && !disabled ? (
        <div className="custom-select-menu">
          {CHOICE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={`custom-option ${option === value ? "active" : ""}`}
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function parseDateTime(value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date();
  }
  return date;
}

function daysInMonth(year: number, monthOneBased: number): number {
  return new Date(year, monthOneBased, 0).getDate();
}

function ContractDateTimePicker({
  value,
  onChange,
  disabled = false,
}: DateTimePickerProps) {
  const parsed = parseDateTime(value);
  const currentYear = new Date().getFullYear();
  const years = [
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const dayCount = daysInMonth(parsed.getFullYear(), parsed.getMonth() + 1);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  function updateDatePart(
    part: "year" | "month" | "day" | "hour" | "minute",
    num: number,
  ): void {
    const date = parseDateTime(value);
    if (part === "year") date.setFullYear(num);
    if (part === "month") date.setMonth(num - 1);
    if (part === "day") date.setDate(num);
    if (part === "hour") date.setHours(num);
    if (part === "minute") date.setMinutes(num);
    date.setSeconds(0);
    onChange(formatDateTimeInput(date));
  }

  return (
    <div className={`datetime-picker ${disabled ? "disabled" : ""}`}>
      <select
        value={parsed.getFullYear()}
        onChange={(e) => updateDatePart("year", Number(e.target.value))}
        disabled={disabled}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}年
          </option>
        ))}
      </select>
      <select
        value={parsed.getMonth() + 1}
        onChange={(e) => updateDatePart("month", Number(e.target.value))}
        disabled={disabled}
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {String(month).padStart(2, "0")}月
          </option>
        ))}
      </select>
      <select
        value={parsed.getDate()}
        onChange={(e) => updateDatePart("day", Number(e.target.value))}
        disabled={disabled}
      >
        {days.map((day) => (
          <option key={day} value={day}>
            {String(day).padStart(2, "0")}日
          </option>
        ))}
      </select>
      <select
        value={parsed.getHours()}
        onChange={(e) => updateDatePart("hour", Number(e.target.value))}
        disabled={disabled}
      >
        {hours.map((hour) => (
          <option key={hour} value={hour}>
            {String(hour).padStart(2, "0")}时
          </option>
        ))}
      </select>
      <select
        value={Math.floor(parsed.getMinutes() / 5) * 5}
        onChange={(e) => updateDatePart("minute", Number(e.target.value))}
        disabled={disabled}
      >
        {minutes.map((minute) => (
          <option key={minute} value={minute}>
            {String(minute).padStart(2, "0")}分
          </option>
        ))}
      </select>
    </div>
  );
}

function App() {
  const [contract, setContract] = useState<ContractData>(
    createDefaultContractData,
  );
  const [newForbiddenItem, setNewForbiddenItem] = useState("");
  const [newScopeItemDraft, setNewScopeItemDraft] = useState<
    Record<string, string>
  >({});
  const [password, setPassword] = useState("");
  const [syncPayload, setSyncPayload] = useState("");
  const [statusText, setStatusText] = useState("就绪");
  const [now, setNow] = useState(new Date());
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [terminateArmed, setTerminateArmed] = useState(false);
  const [signingPhase, setSigningPhase] = useState<SigningPhase>("idle");
  const [domToSubTitleDraft, setDomToSubTitleDraft] = useState("");
  const [subToDomTitleDraft, setSubToDomTitleDraft] = useState("");
  const [hasHydratedStorage, setHasHydratedStorage] = useState(false);
  const signedVisualState = contract.isLocked || signingPhase === "done";

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as unknown;
        setContract(normalizeContractData(parsed));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHasHydratedStorage(true);
  }, []);

  useEffect(() => {
    if (!hasHydratedStorage) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contract));
  }, [contract, hasHydratedStorage]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingText = useMemo(() => {
    const start = new Date(contract.startDate).getTime();
    const end = new Date(contract.endDate).getTime();
    if (Number.isNaN(start)) {
      return "开始时间格式不正确";
    }
    if (Number.isNaN(end)) {
      return "终止时间格式不正确";
    }
    const nowTs = now.getTime();
    const formatDuration = (ms: number): string => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      return `${hours} 小时 ${minutes} 分 ${seconds} 秒`;
    };

    if (nowTs < start) {
      return `协议未开始（距开始 ${formatDuration(start - nowTs)}）`;
    }

    const diff = end - nowTs;
    if (diff <= 0) {
      return "协议已到期";
    }
    return `剩余 ${formatDuration(diff)}`;
  }, [contract.startDate, contract.endDate, now]);

  function updateField<K extends keyof ContractData>(
    field: K,
    value: ContractData[K],
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({ ...prev, [field]: value }));
  }

  function setLockedState(locked: boolean): void {
    setContract((prev) => ({
      ...prev,
      isLocked: locked,
      agreementStatus: locked ? "生效中" : prev.agreementStatus,
    }));
    setTerminateArmed(false);
  }

  async function handleSignContract(): Promise<void> {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    if (signingPhase !== "idle") {
      return;
    }

    setSigningPhase("pressing");
    setStatusText("签约动作识别中：按压确认...");
    await new Promise((resolve) => window.setTimeout(resolve, 420));

    setSigningPhase("scanning");
    setStatusText("签约动作识别中：指纹扫描...");
    await new Promise((resolve) => window.setTimeout(resolve, 1050));

    setLockedState(true);
    setSigningPhase("done");
    setStatusText("签约完成，协议已生效并锁定");
  }

  function handleRenewal(): void {
    if (!contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    const currentEnd = parseDateTime(contract.endDate);
    const nextEnd = new Date(currentEnd.getTime() + 72 * 60 * 60 * 1000);
    setContract((prev) => ({
      ...prev,
      endDate: formatDateTimeInput(nextEnd),
      renewalCount: prev.renewalCount + 1,
      agreementStatus: "生效中",
    }));
    setStatusText("已续约 72 小时");
  }

  function handleTerminate(): void {
    if (!contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    if (!terminateArmed) {
      setTerminateArmed(true);
      setStatusText("终止操作已进入二次确认状态，请再次点击“终止协议”");
      return;
    }
    const firstConfirm = window.confirm(
      "请确认：你将终止当前协议，且终止后不可继续编辑当前协议内容。",
    );
    if (!firstConfirm) {
      setTerminateArmed(false);
      setStatusText("已取消终止");
      return;
    }
    const secondConfirm = window.confirm("二次确认：是否立即终止协议？");
    if (!secondConfirm) {
      setTerminateArmed(false);
      setStatusText("已取消终止");
      return;
    }
    setContract((prev) => ({
      ...prev,
      agreementStatus: "已终止",
      isLocked: true,
    }));
    setTerminateArmed(false);
    setStatusText("协议已终止，仅可查看历史内容");
  }

  function updateScopeChoice(
    sectionId: ScopeSection["id"],
    itemId: string,
    choice: Choice,
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({
      ...prev,
      scopeSections: prev.scopeSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, choice } : item,
              ),
            }
          : section,
      ),
    }));
  }

  function updateScopeText(
    sectionId: ScopeSection["id"],
    itemId: string,
    text: string,
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({
      ...prev,
      scopeSections: prev.scopeSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.map((item) =>
                item.id === itemId ? { ...item, text } : item,
              ),
            }
          : section,
      ),
    }));
  }

  function addScopeItem(sectionId: ScopeSection["id"]): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    const draft = (newScopeItemDraft[sectionId] ?? "").trim();
    if (!draft) {
      return;
    }
    setContract((prev) => ({
      ...prev,
      scopeSections: prev.scopeSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                { id: crypto.randomUUID(), text: draft, choice: "需讨论" },
              ],
            }
          : section,
      ),
    }));
    setNewScopeItemDraft((prev) => ({ ...prev, [sectionId]: "" }));
  }

  function removeScopeItem(
    sectionId: ScopeSection["id"],
    itemId: string,
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({
      ...prev,
      scopeSections: prev.scopeSections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: section.items.filter((item) => item.id !== itemId),
            }
          : section,
      ),
    }));
  }

  function addForbiddenItem(): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    const text = newForbiddenItem.trim();
    if (!text) {
      return;
    }
    setContract((prev) => ({
      ...prev,
      forbiddenItems: [...prev.forbiddenItems, text],
    }));
    setNewForbiddenItem("");
  }

  function removeForbiddenItem(index: number): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({
      ...prev,
      forbiddenItems: prev.forbiddenItems.filter((_, i) => i !== index),
    }));
  }

  function appendTitleRulesFromRaw(
    key: "domToSubTitles" | "subToDomTitles",
    raw: string,
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    const tokens = raw
      .split(/[,\n，;；|]/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      return;
    }
    setContract((prev) => {
      const exists = new Set(prev[key]);
      const merged = [...prev[key]];
      tokens.forEach((token) => {
        if (!exists.has(token)) {
          merged.push(token);
          exists.add(token);
        }
      });
      return { ...prev, [key]: merged };
    });
  }

  function removeTitleRule(
    key: "domToSubTitles" | "subToDomTitles",
    index: number,
  ): void {
    if (contract.isLocked || contract.agreementStatus === "已终止") {
      return;
    }
    setContract((prev) => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  }

  async function buildEncryptedVoucher(): Promise<string> {
    if (!password.trim()) {
      throw new Error("请先输入用于加密的密码");
    }
    return encryptWithPassword(JSON.stringify(contract), password.trim());
  }

  async function handleExportPdf(): Promise<void> {
    try {
      const encryptedVoucher = await buildEncryptedVoucher();
      const trimmedPassword = password.trim();
      const doc = new jsPDF({
        unit: "pt",
        format: "a4",
        encryption: {
          userPassword: trimmedPassword,
          ownerPassword: `${trimmedPassword}#owner`,
          userPermissions: ["print", "copy"],
        },
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 44;

      doc.setProperties({
        title: "线上 BDSM 关系协议书（3天试用）",
        subject: "BDSM Agreement",
        keywords: `${TOKEN_PREFIX}${encryptedVoucher}`,
        creator: "contract-site",
      });

      const fullRows = [
        ["Dom", contract.domName || "未填写"],
        ["Sub", contract.subName || "未填写"],
        ["Dom 对 Sub 称呼规定", contract.domToSubTitles.join("、") || "未填写"],
        ["Sub 对 Dom 称呼规定", contract.subToDomTitles.join("、") || "未填写"],
        ["协议状态", contract.agreementStatus],
        ["是否锁定", yesNo(contract.isLocked)],
        ["开始日期", contract.startDate || "未填写"],
        ["终止日期", contract.endDate || "未填写"],
        ["续约次数", `${contract.renewalCount}`],
        ["双方均成年", yesNo(contract.adulthoodConfirmed)],
        ["清醒签署", yesNo(contract.saneConfirmed)],
        ["知情同意", yesNo(contract.consentConfirmed)],
        ["任一方可随时终止", yesNo(contract.canTerminateAnytime)],
        ["仅限线上互动", yesNo(contract.onlineOnlyConfirmed)],
        ["禁止线下干涉", yesNo(contract.noOfflineInterferenceConfirmed)],
        ["黄色安全词", contract.yellowSafeWord || "未填写"],
        ["红色安全词", contract.redSafeWord || "未填写"],
        ["Dom 承诺（不制造心理伤害）", yesNo(contract.domCommitNoPsychHarm)],
        ["Dom 承诺（不以现实威胁控制）", yesNo(contract.domCommitNoRealThreat)],
        [
          "Dom 承诺（不剥夺现实独立性）",
          yesNo(contract.domCommitNoIndependenceLoss),
        ],
        ["Aftercare 每日复盘", yesNo(contract.aftercareDailyReview)],
        ["Aftercare 情绪确认", yesNo(contract.aftercareEmotionCheck)],
        ["Aftercare 心理安全优先", yesNo(contract.aftercareSafetyFirst)],
        ["终止条件-任一方提出", yesNo(contract.terminationByEitherParty)],
        ["终止条件-信任破坏", yesNo(contract.terminationByTrustBreak)],
        [
          "终止条件-违反禁止项",
          yesNo(contract.terminationByForbiddenViolation),
        ],
        ["终止条件-72小时未续约", yesNo(contract.terminationByTimeout)],
        ["禁止玩法清单", contract.forbiddenItems.join("；") || "未填写"],
        ["补充说明", contract.extraNotes || "无"],
      ];

      const templateHtml = AGREEMENT_TEMPLATE_SECTIONS.map(
        (section) => `
          <section>
            <h3>${escapeHtml(section.title)}</h3>
            <ul>
              ${section.lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}
            </ul>
          </section>
        `,
      ).join("");

      const scopeHtml = contract.scopeSections
        .map(
          (section) => `
            <section>
              <h3>${escapeHtml(section.title)}</h3>
              <p>${escapeHtml(section.description)}</p>
              <ul>
                ${section.items
                  .map(
                    (item) =>
                      `<li>${escapeHtml(item.text)}（${escapeHtml(item.choice)}）</li>`,
                  )
                  .join("")}
              </ul>
            </section>
          `,
        )
        .join("");

      const dataHtml = fullRows
        .map(
          ([label, value]) =>
            `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`,
        )
        .join("");

      const printable = document.createElement("div");
      printable.style.position = "fixed";
      printable.style.left = "0";
      printable.style.top = "0";
      printable.style.zIndex = "-1";
      printable.style.pointerEvents = "none";
      printable.style.width = "900px";
      printable.style.padding = "0";
      printable.style.background = "#fff";
      printable.style.color = "#4e3144";
      printable.style.fontFamily = "Microsoft YaHei, Segoe UI, sans-serif";
      printable.innerHTML = `
        <div style="padding:18px 20px; line-height:1.6;">
          <h1 style="margin:0 0 6px 0; font-size:22px;">线上 BDSM 关系协议书（3天试用）</h1>
          <p style="margin:0 0 16px 0; font-size:12px; color:#6a4f60;">导出时间：${escapeHtml(new Date().toLocaleString())}</p>
          <h2 style="margin:12px 0 8px; font-size:16px;">【协议完整条款】</h2>
          ${templateHtml}
          <h2 style="margin:16px 0 8px; font-size:16px;">【玩法范畴明细】</h2>
          ${scopeHtml}
          <h2 style="margin:16px 0 8px; font-size:16px;">【双方当前填写内容归档】</h2>
          <table style="width:100%; border-collapse:collapse; font-size:13px;">
            ${dataHtml}
          </table>
        </div>
      `;
      printable.querySelectorAll("h3").forEach((node) => {
        const el = node as HTMLElement;
        el.style.margin = "10px 0 4px";
        el.style.fontSize = "14px";
      });
      printable.querySelectorAll("ul").forEach((node) => {
        const el = node as HTMLElement;
        el.style.margin = "6px 0 8px 0";
        el.style.paddingLeft = "18px";
      });
      printable.querySelectorAll("p").forEach((node) => {
        const el = node as HTMLElement;
        if (!el.style.margin) {
          el.style.margin = "4px 0 8px";
        }
      });
      printable.querySelectorAll("th,td").forEach((node) => {
        const el = node as HTMLElement;
        el.style.border = "1px solid #e8d3df";
        el.style.padding = "6px 8px";
        el.style.verticalAlign = "top";
      });
      printable.querySelectorAll("th").forEach((node) => {
        const el = node as HTMLElement;
        el.style.width = "240px";
        el.style.background = "#fff5fb";
        el.style.textAlign = "left";
      });

      document.body.appendChild(printable);
      try {
        await new Promise((resolve) =>
          window.requestAnimationFrame(() => resolve(null)),
        );
        if ("fonts" in document) {
          await document.fonts.ready;
        }

        const canvas = await html2canvas(printable, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/png");
        const contentWidth = pageWidth - margin * 2;
        const pageHeight = doc.internal.pageSize.getHeight();
        const contentHeight = pageHeight - margin * 2;
        const renderedHeight = (canvas.height * contentWidth) / canvas.width;

        let remaining = renderedHeight;
        let offsetY = 0;
        doc.addImage(
          imgData,
          "PNG",
          margin,
          margin + offsetY,
          contentWidth,
          renderedHeight,
        );
        remaining -= contentHeight;

        while (remaining > 0) {
          doc.addPage();
          offsetY = -(renderedHeight - remaining);
          doc.addImage(
            imgData,
            "PNG",
            margin,
            margin + offsetY,
            contentWidth,
            renderedHeight,
          );
          remaining -= contentHeight;
        }
      } finally {
        document.body.removeChild(printable);
      }

      const filename = `bdsm-contract-${Date.now()}.pdf`;
      doc.save(filename);
      setStatusText(`PDF 已加密保存: ${filename}（打开需密码）`);
    } catch (error) {
      setStatusText(error instanceof Error ? error.message : "导出失败");
    }
  }

  async function handleCreateSyncText(): Promise<void> {
    try {
      const encryptedVoucher = await buildEncryptedVoucher();
      const encoded = toBase64(new TextEncoder().encode(encryptedVoucher));
      setSyncPayload(encoded);
      setStatusText("已生成可传输的同步密文");
    } catch (error) {
      setStatusText(
        error instanceof Error ? error.message : "同步密文生成失败",
      );
    }
  }

  async function handleImportSyncText(): Promise<void> {
    try {
      if (!password.trim()) {
        throw new Error("请先输入密码");
      }
      if (!syncPayload.trim()) {
        throw new Error("请先粘贴同步密文");
      }
      const encrypted = new TextDecoder().decode(
        fromBase64(syncPayload.trim()),
      );
      const plain = await decryptWithPassword(encrypted, password.trim());
      const parsed = JSON.parse(plain) as unknown;
      setContract(normalizeContractData(parsed));
      setStatusText("已从同步密文恢复协议（已自动兼容字段变更）");
    } catch {
      setStatusText("同步密文导入失败，请检查密码或内容");
    }
  }

  async function extractTokenFromPdf(
    file: File,
    pdfPassword: string,
  ): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer, password: pdfPassword })
      .promise;

    const metadata = (await pdf.getMetadata().catch(() => null)) as {
      info?: Record<string, unknown>;
    } | null;
    const keywordRaw = metadata?.info?.Keywords;
    if (typeof keywordRaw === "string") {
      const matchedFromMetadata = keywordRaw.match(
        /BDSM_CONTRACT_TOKEN:([A-Za-z0-9+/=._-]+)/,
      );
      if (matchedFromMetadata?.[1]) {
        return matchedFromMetadata[1];
      }
    }

    let text = "";
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      text += pageText;
    }

    const compact = text.replace(/\s+/g, "");
    const match = compact.match(/BDSM_CONTRACT_TOKEN:([A-Za-z0-9+/=._-]+)/);
    if (!match?.[1]) {
      throw new Error("未在 PDF 中找到加密凭证");
    }
    return match[1];
  }

  async function handleImportFromPdf(): Promise<void> {
    try {
      if (!pdfFile) {
        throw new Error("请先选择 PDF 文件");
      }
      if (!password.trim()) {
        throw new Error("请输入密码");
      }
      const token = await extractTokenFromPdf(pdfFile, password.trim());
      const plain = await decryptWithPassword(token, password.trim());
      const parsed = JSON.parse(plain) as unknown;
      setContract(normalizeContractData(parsed));
      setStatusText("已通过密码解密 PDF 并恢复协议内容（已自动兼容字段变更）");
    } catch {
      setStatusText("PDF 加载失败：密码错误、文件损坏或凭证缺失");
    }
  }

  return (
    <main className="contract-app">
      <header className="contract-header">
        <div className="header-brand">
          <Logo size="medium" paddingValue="small" />
          <div>
            <p className="contract-kicker">线上关系契约文书</p>
            <h1>BDSM 关系协议书（3 天试用）</h1>
          </div>
        </div>
        <div className="header-meta">
          <span>状态：{contract.agreementStatus}</span>
          <span>当前时间：{now.toLocaleString()}</span>
          <span>{remainingText}</span>
          <span>续约次数：{contract.renewalCount}</span>
        </div>
      </header>
      <section className="contract-card">
        <h2>第零章 · 契约控制台</h2>
        <p className="desc">
          锁定后所有条款将不可编辑，仅保留“续约”与“终止”操作。
        </p>
        <div className="action-row">
          <button
            type="button"
            className={`sign-btn phase-${signingPhase}`}
            onClick={() => void handleSignContract()}
            disabled={
              contract.isLocked ||
              contract.agreementStatus === "已终止" ||
              signingPhase === "pressing" ||
              signingPhase === "scanning"
            }
          >
            <img
              className={`fingerprint-mark ${signedVisualState ? "is-signed" : "is-pending"}`}
              src={fingerprintAsset}
              alt=""
              aria-hidden
            />
            <span>
              {signingPhase === "pressing" && "按压中..."}
              {signingPhase === "scanning" && "扫描中..."}
              {signingPhase === "done" && "签约完成"}
              {signingPhase === "idle" && "签约"}
            </span>
          </button>
          <button
            type="button"
            onClick={handleRenewal}
            disabled={
              !contract.isLocked || contract.agreementStatus === "已终止"
            }
          >
            续约 72 小时
          </button>
          <button
            type="button"
            className={terminateArmed ? "danger armed" : "danger"}
            onClick={handleTerminate}
            disabled={
              !contract.isLocked || contract.agreementStatus === "已终止"
            }
          >
            {terminateArmed ? "再次确认终止" : "终止协议"}
          </button>
        </div>
        <div className="status-line with-seal">
          <p>{statusText}</p>
          {signedVisualState ? (
            <img
              className="seal-mark is-signed"
              src={sealAsset}
              alt="签约盖章"
            />
          ) : null}
        </div>
      </section>
      <section className="contract-card">
        <h2>第一章 · 前提声明</h2>
        <div className="check-grid">
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.adulthoodConfirmed}
              onChange={(event) =>
                updateField("adulthoodConfirmed", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            双方均为成年人
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.saneConfirmed}
              onChange={(event) =>
                updateField("saneConfirmed", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            双方在理智清醒状态下签署
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.consentConfirmed}
              onChange={(event) =>
                updateField("consentConfirmed", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            遵循 SSC（安全/理智/知情同意）
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.canTerminateAnytime}
              onChange={(event) =>
                updateField("canTerminateAnytime", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            任一方可在任何时间撤回同意并终止
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.onlineOnlyConfirmed}
              onChange={(event) =>
                updateField("onlineOnlyConfirmed", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            本协议仅适用于线上互动
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.noOfflineInterferenceConfirmed}
              onChange={(event) =>
                updateField(
                  "noOfflineInterferenceConfirmed",
                  event.target.checked,
                )
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            禁止任何线下行为与现实社交干涉
          </label>
        </div>
      </section>
      <section className="contract-card">
        <h2>第二章 · 签署主体与期限</h2>
        <div className="grid">
          <label>
            Dom（主导方）
            <input
              value={contract.domName}
              onChange={(event) => updateField("domName", event.target.value)}
              placeholder="输入 Dom 名称"
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
          <label>
            Sub（服从方）
            <input
              value={contract.subName}
              onChange={(event) => updateField("subName", event.target.value)}
              placeholder="输入 Sub 名称"
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
          <label className="full-row">
            Dom 对 Sub 的称呼规定（多输入标签）
            <div
              className={`tag-input-shell ${
                contract.isLocked || contract.agreementStatus === "已终止"
                  ? "disabled"
                  : ""
              }`}
              onClick={() => {
                const input = document.getElementById(
                  "dom-to-sub-title-input",
                ) as HTMLInputElement | null;
                input?.focus();
              }}
            >
              {contract.domToSubTitles.map((title, index) => (
                <span key={`${title}-${index}`} className="title-tag">
                  {title}
                  {contract.isLocked ||
                  contract.agreementStatus === "已终止" ? null : (
                    <button
                      type="button"
                      className="tag-remove"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeTitleRule("domToSubTitles", index);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <input
                id="dom-to-sub-title-input"
                value={domToSubTitleDraft}
                onChange={(event) => setDomToSubTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  const triggerKeys = ["Enter", "Tab", ","];
                  const isChineseComma = event.key === "，";
                  if (triggerKeys.includes(event.key) || isChineseComma) {
                    event.preventDefault();
                    appendTitleRulesFromRaw(
                      "domToSubTitles",
                      domToSubTitleDraft,
                    );
                    setDomToSubTitleDraft("");
                  } else if (
                    event.key === "Backspace" &&
                    !domToSubTitleDraft &&
                    contract.domToSubTitles.length > 0
                  ) {
                    removeTitleRule(
                      "domToSubTitles",
                      contract.domToSubTitles.length - 1,
                    );
                  }
                }}
                onBlur={() => {
                  appendTitleRulesFromRaw("domToSubTitles", domToSubTitleDraft);
                  setDomToSubTitleDraft("");
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text");
                  if (/[,\n，;；|]/.test(pasted)) {
                    event.preventDefault();
                    appendTitleRulesFromRaw("domToSubTitles", pasted);
                    setDomToSubTitleDraft("");
                  }
                }}
                placeholder="输入称呼后回车，例如：小狗、宠物、宝贝"
                disabled={
                  contract.isLocked || contract.agreementStatus === "已终止"
                }
                className="tag-inline-input"
              />
            </div>
          </label>
          <label className="full-row">
            Sub 对 Dom 的称呼规定（多输入标签）
            <div
              className={`tag-input-shell ${
                contract.isLocked || contract.agreementStatus === "已终止"
                  ? "disabled"
                  : ""
              }`}
              onClick={() => {
                const input = document.getElementById(
                  "sub-to-dom-title-input",
                ) as HTMLInputElement | null;
                input?.focus();
              }}
            >
              {contract.subToDomTitles.map((title, index) => (
                <span key={`${title}-${index}`} className="title-tag">
                  {title}
                  {contract.isLocked ||
                  contract.agreementStatus === "已终止" ? null : (
                    <button
                      type="button"
                      className="tag-remove"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        removeTitleRule("subToDomTitles", index);
                      }}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              <input
                id="sub-to-dom-title-input"
                value={subToDomTitleDraft}
                onChange={(event) => setSubToDomTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  const triggerKeys = ["Enter", "Tab", ","];
                  const isChineseComma = event.key === "，";
                  if (triggerKeys.includes(event.key) || isChineseComma) {
                    event.preventDefault();
                    appendTitleRulesFromRaw(
                      "subToDomTitles",
                      subToDomTitleDraft,
                    );
                    setSubToDomTitleDraft("");
                  } else if (
                    event.key === "Backspace" &&
                    !subToDomTitleDraft &&
                    contract.subToDomTitles.length > 0
                  ) {
                    removeTitleRule(
                      "subToDomTitles",
                      contract.subToDomTitles.length - 1,
                    );
                  }
                }}
                onBlur={() => {
                  appendTitleRulesFromRaw("subToDomTitles", subToDomTitleDraft);
                  setSubToDomTitleDraft("");
                }}
                onPaste={(event) => {
                  const pasted = event.clipboardData.getData("text");
                  if (/[,\n，;；|]/.test(pasted)) {
                    event.preventDefault();
                    appendTitleRulesFromRaw("subToDomTitles", pasted);
                    setSubToDomTitleDraft("");
                  }
                }}
                placeholder="输入称呼后回车，例如：主人、姐姐"
                disabled={
                  contract.isLocked || contract.agreementStatus === "已终止"
                }
                className="tag-inline-input"
              />
            </div>
          </label>
          <label className="full-row">
            开始日期
            <ContractDateTimePicker
              value={contract.startDate}
              onChange={(value) => updateField("startDate", value)}
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
          <label className="full-row">
            终止日期
            <ContractDateTimePicker
              value={contract.endDate}
              onChange={(value) => updateField("endDate", value)}
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
          <label>
            黄色安全词
            <input
              value={contract.yellowSafeWord}
              onChange={(event) =>
                updateField("yellowSafeWord", event.target.value)
              }
              placeholder="例：Yellow"
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
          <label>
            红色安全词
            <input
              value={contract.redSafeWord}
              onChange={(event) =>
                updateField("redSafeWord", event.target.value)
              }
              placeholder="例：Red"
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
          </label>
        </div>
      </section>
      <section className="contract-card">
        <h2>第三章 · 玩法范畴协定（可编辑条目）</h2>
        {contract.scopeSections.map((section) => (
          <article key={section.id} className="scope-card">
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <div className="scope-items">
              {section.items.map((item) => (
                <div key={item.id} className="scope-item">
                  <input
                    value={item.text}
                    onChange={(event) =>
                      updateScopeText(section.id, item.id, event.target.value)
                    }
                    disabled={
                      contract.isLocked || contract.agreementStatus === "已终止"
                    }
                  />
                  <CustomSelect
                    value={item.choice}
                    onChange={(choice) =>
                      updateScopeChoice(section.id, item.id, choice)
                    }
                    disabled={
                      contract.isLocked || contract.agreementStatus === "已终止"
                    }
                  />
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => removeScopeItem(section.id, item.id)}
                    disabled={
                      contract.isLocked || contract.agreementStatus === "已终止"
                    }
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
            <div className="inline-adder">
              <input
                value={newScopeItemDraft[section.id] ?? ""}
                placeholder="添加新条目..."
                onChange={(event) =>
                  setNewScopeItemDraft((prev) => ({
                    ...prev,
                    [section.id]: event.target.value,
                  }))
                }
                disabled={
                  contract.isLocked || contract.agreementStatus === "已终止"
                }
              />
              <button
                type="button"
                onClick={() => addScopeItem(section.id)}
                disabled={
                  contract.isLocked || contract.agreementStatus === "已终止"
                }
              >
                添加条目
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="contract-card">
        <h2>第四章 · 明确不在范围内的玩法（禁止）</h2>
        <ul className="forbidden-list">
          {contract.forbiddenItems.map((item, index) => (
            <li key={`${item}-${index}`}>
              <span>❌ {item}</span>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => removeForbiddenItem(index)}
                disabled={
                  contract.isLocked || contract.agreementStatus === "已终止"
                }
              >
                移除
              </button>
            </li>
          ))}
        </ul>
        <div className="inline-adder">
          <input
            value={newForbiddenItem}
            onChange={(event) => setNewForbiddenItem(event.target.value)}
            placeholder="新增禁止玩法..."
            disabled={
              contract.isLocked || contract.agreementStatus === "已终止"
            }
          />
          <button
            type="button"
            onClick={addForbiddenItem}
            disabled={
              contract.isLocked || contract.agreementStatus === "已终止"
            }
          >
            添加禁止项
          </button>
        </div>
      </section>
      <section className="contract-card">
        <h2>第五章 · 关系承诺、事后照顾与终止条款</h2>
        <div className="check-grid">
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.domCommitNoPsychHarm}
              onChange={(event) =>
                updateField("domCommitNoPsychHarm", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            Dom 不利用情感依附制造心理伤害
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.domCommitNoRealThreat}
              onChange={(event) =>
                updateField("domCommitNoRealThreat", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            Dom 不以现实威胁作为控制手段
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.domCommitNoIndependenceLoss}
              onChange={(event) =>
                updateField("domCommitNoIndependenceLoss", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            Dom 不剥夺 Sub 的现实独立性
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.aftercareDailyReview}
              onChange={(event) =>
                updateField("aftercareDailyReview", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            每日互动结束后进行关怀与心理安全确认并复盘
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.aftercareEmotionCheck}
              onChange={(event) =>
                updateField("aftercareEmotionCheck", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            Dom 需确认 Sub 情绪稳定
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.aftercareSafetyFirst}
              onChange={(event) =>
                updateField("aftercareSafetyFirst", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            出现不适时优先处理现实心理安全
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.terminationByEitherParty}
              onChange={(event) =>
                updateField("terminationByEitherParty", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            任一方主动提出终止即生效
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.terminationByTrustBreak}
              onChange={(event) =>
                updateField("terminationByTrustBreak", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            出现信任破坏自动终止
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.terminationByForbiddenViolation}
              onChange={(event) =>
                updateField(
                  "terminationByForbiddenViolation",
                  event.target.checked,
                )
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            违反禁止范畴自动终止
          </label>
          <label className="check-item">
            <input
              type="checkbox"
              checked={contract.terminationByTimeout}
              onChange={(event) =>
                updateField("terminationByTimeout", event.target.checked)
              }
              disabled={
                contract.isLocked || contract.agreementStatus === "已终止"
              }
            />
            超过 72 小时未续约自动终止
          </label>
        </div>
      </section>
      <section className="contract-card">
        <label>
          <h2>第六章 · 补充条款 / 备注</h2>
          <textarea
            value={contract.extraNotes}
            onChange={(event) => updateField("extraNotes", event.target.value)}
            placeholder="补充你们双方额外约定..."
            disabled={
              contract.isLocked || contract.agreementStatus === "已终止"
            }
          />
        </label>
      </section>
      <section className="contract-card notice">
        <h2>第七章 · 协议性质说明</h2>
        <p>
          本协议为线上、临时试用协议，不具法律效力，仅用于双方知情同意下的角色互动约定。
        </p>
        <p>
          页面数据会自动保存在当前浏览器（LocalStorage），下次打开页面会自动恢复上次编辑内容。
        </p>
      </section>

      <section className="contract-card">
        <h2>加密、传输、归档</h2>
        <label style={{ padding: "10px 12px" }}>
          设置密码（用于加密 PDF 打开权限、PDF 凭证与同步密文）
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入密码"
          />
          {<p className="status-line">{statusText}</p>}
        </label>
        <div className="button-row" style={{ padding: "10px 12px" }}>
          <button type="button" onClick={() => void handleExportPdf()}>
            保存为 PDF
          </button>
          <button type="button" onClick={() => void handleCreateSyncText()}>
            生成传输密文
          </button>
          <button type="button" onClick={() => void handleImportSyncText()}>
            从传输密文加载
          </button>
        </div>
        <label style={{ padding: "10px 12px" }}>
          同步密文（加密后 + Base64，可发送给对方）
          <textarea
            value={syncPayload}
            onChange={(event) => setSyncPayload(event.target.value)}
            placeholder="点击“生成传输密文”后可复制发送；也可粘贴后导入"
          />
        </label>
      </section>
      <section className="contract-card">
        <h2> 从 PDF 恢复历史协议</h2>
        <label style={{ padding: "24px 12px" }}>
          选择之前导出的 PDF 文件
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <button type="button" onClick={() => void handleImportFromPdf()}>
          从 PDF 加载
        </button>
      </section>
    </main>
  );
}

export default App;
