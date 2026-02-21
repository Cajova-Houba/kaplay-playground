import type { Comp } from "kaplay";

interface SelectableComp extends Comp {
    id: string,
    selected: boolean,
    toggleSelect: () => void;
}

class SelectableCompImpl implements SelectableComp {
    readonly id: string = "selectable";
    selected: boolean = false;

    toggleSelect() {
        this.selected = ! this.selected;
    }
}

export function selectable(): SelectableComp {
    return new SelectableCompImpl();
}