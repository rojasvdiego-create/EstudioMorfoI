export const SHORT_ANSWER_MAX_LENGTH = 160;

export function isShortAnswer(question) {
  return Array.isArray(question?.acceptedAnswers);
}

export function isValidAnswer(question, value) {
  if (isShortAnswer(question)) {
    return typeof value === 'string' && value.length <= SHORT_ANSWER_MAX_LENGTH && value.trim() !== '';
  }
  return Array.isArray(question?.options) && Number.isInteger(value) && value >= 0 && value < question.options.length;
}

export function normalizeShortAnswer(value) {
  if (typeof value !== 'string') return '';

  let text = value.normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('es')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[¿¡]+|[.!?,;:]+$/g, '')
    .trim();

  // Unify Spanish number formatting before interpreting punctuation as lists.
  text = text
    .replace(/(?<![\p{L}\d.,])[1-9]\d{0,2}(?:[. ]\d{3})+(?![\d.,])/gu, group => group.replace(/[. ]/g, ''))
    .replace(/(\d),(?=\d)/g, '$1.')
    .replace(/(?<![\d.])(\d+)\.(\d+)(?![\d.])/g, (_, whole, fraction) => {
      const decimal = fraction.replace(/0+$/, '');
      return decimal ? `${whole}.${decimal}` : whole;
    })
    .replace(/(?<!\p{L})[μu]m(?!\p{L})/gu, 'μm')
    .replace(/(?<!\p{L})mm\^3(?!\d)/gu, 'mm3');

  // A range must match both endpoints. The question controls which units to accept.
  text = text
    .replace(/^entre (\d+(?:\.\d+)?(?:\s*(?:%|μm))?) y (?=\d)/, '$1-')
    .replace(/^de (?=\d)/, '')
    .replace(/(\d(?:\s*(?:%|μm))?)\s*(?:[−–—-]|\ba\b|\bhasta\b)\s*(?=\d)/g, '$1-')
    .replace(/(\d+)\s*(%|μm)-(\d+(?:\.\d+)?)(?:\s*\2)?$/u, '$1-$3 $2')
    .replace(/(\d)\s*(%|μm)(?!\p{L})/gu, '$1 $2')
    .replace(/\s*\/\s*/g, '/');

  // Commas and semicolons in a list stand in for "y". Term order still matters.
  return text.replace(/\s*[,;]\s*(?:y\s+)?/g, ' y ').trim();
}

export function isCorrectAnswer(question, value) {
  if (!isValidAnswer(question, value)) return false;
  if (!isShortAnswer(question)) return value === question.correctIndex;
  const submitted = normalizeShortAnswer(value);
  return submitted !== '' && question.acceptedAnswers.some(answer => normalizeShortAnswer(answer) === submitted);
}
