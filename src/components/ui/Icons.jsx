// Icons wrapper using lucide-react
// This maintains backward compatibility with existing <Icons.X /> usage pattern
// Default size is set to 16px to match original icons
import {
    Plus,
    Trash2,
    Calendar,
    MessageSquare,
    X,
    LayoutDashboard,
    Send,
    Edit,
    Check,
    ChevronDown,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
    Settings,
    Search,
    Bell,
    RotateCcw,
    Mic,
    MicOff,
    ArrowDownAZ,
    CheckSquare,
    Square,
    Clock,
    Info,
    GripVertical,
    MessageSquarePlus,
    Activity,
    UserPlus,
    Users,
    Copy,
    AlertCircle,
    Building2,
    User,
    DollarSign,
    GitBranch,
    Loader,
    Trophy,
    XCircle,
    Mail,
    Phone,
    LayoutGrid,
    List,
    HelpCircle
} from 'lucide-react';

// Helper to create icons with smaller default size
const withDefaultSize = (Icon, defaultSize = 16) => {
    const WrappedIcon = ({ size = defaultSize, ...props }) => (
        <Icon size={size} {...props} />
    );
    WrappedIcon.displayName = Icon.displayName || Icon.name;
    return WrappedIcon;
};

// Re-export as Icons object with smaller default sizes
export const Icons = {
    Plus: withDefaultSize(Plus, 16),
    Trash2: withDefaultSize(Trash2, 14),
    Calendar: withDefaultSize(Calendar, 12),
    MessageSquare: withDefaultSize(MessageSquare, 12),
    X: withDefaultSize(X, 18),
    Layout: withDefaultSize(LayoutDashboard, 18),
    Send: withDefaultSize(Send, 14),
    Edit: withDefaultSize(Edit, 14),
    Check: withDefaultSize(Check, 14),
    ChevronDown: withDefaultSize(ChevronDown, 14),
    ChevronUp: withDefaultSize(ChevronUp, 14),
    ChevronLeft: withDefaultSize(ChevronLeft, 14),
    ChevronRight: withDefaultSize(ChevronRight, 14),
    Settings: withDefaultSize(Settings, 14),
    Search: withDefaultSize(Search, 14),
    Bell: withDefaultSize(Bell, 14),
    RotateCcw: withDefaultSize(RotateCcw, 14),
    Mic: withDefaultSize(Mic, 16),
    MicOff: withDefaultSize(MicOff, 16),
    Sort: withDefaultSize(ArrowDownAZ, 14),
    CheckSquare: withDefaultSize(CheckSquare, 14),
    Square: withDefaultSize(Square, 14),
    Clock: withDefaultSize(Clock, 14),
    Info: withDefaultSize(Info, 14),
    GripVertical: withDefaultSize(GripVertical, 14),
    MessageSquarePlus: withDefaultSize(MessageSquarePlus, 14),
    Activity: withDefaultSize(Activity, 16),
    UserPlus: withDefaultSize(UserPlus, 16),
    Users: withDefaultSize(Users, 16),
    Copy: withDefaultSize(Copy, 14),
    AlertCircle: withDefaultSize(AlertCircle, 14),
    Building: withDefaultSize(Building2, 16),
    User: withDefaultSize(User, 16),
    DollarSign: withDefaultSize(DollarSign, 14),
    GitBranch: withDefaultSize(GitBranch, 16),
    Loader: withDefaultSize(Loader, 16),
    Trophy: withDefaultSize(Trophy, 14),
    XCircle: withDefaultSize(XCircle, 14),
    Mail: withDefaultSize(Mail, 14),
    Phone: withDefaultSize(Phone, 14),
    LayoutGrid: withDefaultSize(LayoutGrid, 16),
    List: withDefaultSize(List, 16),
    Help: withDefaultSize(HelpCircle, 16)
};
