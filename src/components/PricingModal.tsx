import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const features = [
  "Unlimited questions per day",
  "Priority AI responses",
  "Advanced whiteboard visualizations",
  "Exam prep & study plans",
  "Save unlimited concepts",
];

const PricingModal: React.FC<PricingModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-center">
            Chalk Pro
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Unlock unlimited learning with Mr. White
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="text-center">
            <span className="text-4xl font-bold text-foreground">$9</span>
            <span className="text-muted-foreground">/month</span>
          </div>

          <ul className="space-y-3 w-full">
            {features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-foreground">
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
                {feature}
              </li>
            ))}
          </ul>

          <Button className="w-full" size="lg">
            Upgrade to Pro
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Cancel anytime. 7-day free trial included.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PricingModal;
