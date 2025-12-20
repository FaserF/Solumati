import { User, CheckCircle, EyeOff } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';

const MatchCard = ({ match, isGuest, onClick, t }) => {
    return (
        <Card
            onClick={onClick}
            variant="glass-card"
            className="group flex items-center justify-between p-5 hover:scale-[1.02] cursor-pointer transition-all duration-300 border-zinc-200 dark:border-zinc-800"
        >
            <div className="flex items-center gap-5 relative z-10">
                <div className={cn(
                    "w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden bg-zinc-100 dark:bg-zinc-800 shadow-inner",
                    isGuest && "filter blur-sm opacity-50"
                )}>
                    {isGuest ? <EyeOff className="text-zinc-400" /> : <User className="text-zinc-400 w-8 h-8" />}
                </div>

                <div>
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-gray-100 flex items-center gap-1">
                        {match.username}
                        {!isGuest && <CheckCircle size={14} className="text-white fill-sky-500" />}
                    </h3>
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {t ? t('match.compatibility', 'Compatibility') : 'Compatibility'}
                    </p>
                </div>
            </div>

            <div className="text-right">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-teal-600 drop-shadow-sm">
                    {match.score}%
                </div>
            </div>
        </Card>
    );
};

export default MatchCard;
