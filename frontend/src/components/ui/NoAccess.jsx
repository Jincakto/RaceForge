import { Card } from './Card';

export function NoAccess({ text }) {
  return <Card className="p-10 text-center max-w-md"><div className="text-4xl mb-3">🔒</div><div className="font-semibold text-gray-600">{text}</div></Card>;
}
