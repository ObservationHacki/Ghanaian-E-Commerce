import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { districtsForRegion } from '@/lib/ghana-regions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function DistrictCombobox({
  region,
  value,
  onChange,
  id,
  disabled,
  className,
}: {
  region: string;
  value: string;
  onChange: (district: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const districts = useMemo(() => districtsForRegion(region), [region]);
  const ready = Boolean(region) && !disabled;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={!ready}
          className={cn(
            'h-[3.25rem] w-full justify-between rounded-2xl border-hairline px-5 text-base font-normal shadow-none hover:bg-background',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {value || (region ? 'Search or select a district' : 'Select a region first')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] rounded-2xl border-hairline p-0"
      >
        <Command>
          <CommandInput placeholder="Type a district name…" className="h-12" />
          <CommandList className="max-h-[min(20rem,50vh)] overscroll-contain">
            <CommandEmpty>No district matches that search.</CommandEmpty>
            <CommandGroup>
              {districts.map((district) => (
                <CommandItem
                  key={district}
                  value={district}
                  onSelect={() => {
                    onChange(district);
                    setOpen(false);
                  }}
                  className="rounded-xl py-2.5 text-[15px]"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === district ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {district}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
