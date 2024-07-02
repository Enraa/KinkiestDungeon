
interface RecyclerResource {
	/** Number is base yield, minimum 1 */
	Yield: number,
	/** Processed per floor, per servant */
	Rate: number,
}

let RecyclerResources: Record<string, RecyclerResource> = {
	Rope: {
		Yield: 20,
		Rate: 100,
	},
	Leather: {
		Yield: 12,
		Rate: 25,
	},
	Metal: {
		Yield: 5,
		Rate: 8,
	},
	Latex: {
		Yield: 12,
		Rate: 30,
	},
	Rune: {
		Yield: 0.0001,
		Rate: 4,
	},
}

interface RecyclerOutputs {
	Rope: number,
	Leather: number,
	Metal: number,
	Latex: number,
	Rune: number,
}


function KDGetRecyclerRate(Servants: number[]): Record<string, number> {
	let output = {};
	let mult = 0.5;
	for (let id of Servants) {
		let servant = KDGetServantEnemy(KDGameData.Collection["" + id]);
		if (servant) {
			mult += 0.8 + KDEnemyTypeRank(servant);
		}
	}
	for (let resource of Object.keys(RecyclerResources)) {
		let resourceInput = KDGameData.FacilitiesData["RecyclerInput_" + resource];
		let resourceRate = Math.min(resourceInput, mult * RecyclerResources[resource].Rate);
		output[resource] = Math.ceil(resourceRate);
	}
	return output;
}

function KDRecycleItem(item: item, count: number = 0) : RecyclerOutputs {
	let outputs: RecyclerOutputs = {
		Latex: 0,
		Metal: 0,
		Rune: 0,
		Leather: 0,
		Rope: 0,
	};

	let type = KDRestraint(item);
	let variant = KinkyDungeonRestraintVariants[item.inventoryVariant || item.name];
	let mult = 1 + Math.max(0, type.power * 0.5);

	if (variant) {
		// TODO add an actual event
		outputs.Rune += Math.ceil(RecyclerResources.Rune.Yield * mult);
	}

	for (let shrine of type.shrine) {
		if (RecyclerResources[shrine]) {
			outputs[shrine] = (outputs[shrine] || 0) + Math.ceil(RecyclerResources[shrine].Yield * mult);
		}
	}

	if (count > 0) {
		for (let i = 0; i < count; i++) {
			if (KinkyDungeonInventoryGetSafe(item.inventoryVariant || item.name)) {
				let inv = KinkyDungeonInventoryGetSafe(item.inventoryVariant || item.name);
				if (inv.quantity > 1) {
					inv.quantity -= 1;
				} else {
					KinkyDungeonInventoryRemoveSafe(inv);
				}
			}
		}
	}

	return outputs;
}

function KDChangeRecyclerInput(amount: RecyclerOutputs) {
	for (let entry of Object.entries(amount)) {
		KDGameData.FacilitiesData["RecyclerInput_" + entry[0]] = Math.max(0,
			KDGameData.FacilitiesData["RecyclerInput_" + entry[0]] + entry[1]
		);
	}
}
function KDChangeRecyclerResources(amount: RecyclerOutputs) {
	for (let entry of Object.entries(amount)) {
		KDGameData.FacilitiesData["Recycler_" + entry[0]] = Math.max(0,
			KDGameData.FacilitiesData["Recycler_" + entry[0]] + entry[1]
		);
	}
}

function KDRecycleString(item: item, quantity: number) : string {
	let temp = "";
	let outputs = KDRecycleItem(item, 0);

	for (let output of Object.entries(outputs)) {
		if (output[1] > 0) {
			let str = Math.round(quantity * output[1]) + TextGet("KDRecycleOutput_" + output[0]);
			if (temp.length > 0) temp = temp + "";
			temp = temp + str;
		}
	}

	return temp;
}


function KDDrawRecycler(x: number, y: number, width: number): number {
	let dd = KDMapData.RoomType == "Summit" ? 400 : 300;
	let cats = KDListRecyclerCats();
	if (KDMapData.RoomType == "Summit") {
		dd += 100 + Math.ceil(cats.length/KDRecyclerCatsPerRow) * KDRecyclerCatSpacing;
	}
	if (y + dd < 940) {
		let rID = 0;
		let spacing = 180;
		let res = Object.keys(RecyclerResources);
		let rates = KDGetRecyclerRate(KDGameData.FacilitiesData.Servants_Recycler);
		let yy = y;

		yy += KDDrawServantPrisonerList("Recycler", x - 200, yy + 70, width);

		for (let resource of res) {
			KDDraw(kdcanvas, kdpixisprites, "fac_rec_res_" + resource,
				KinkyDungeonRootDirectory + "UI/Resource/" + resource + ".png",
				x + 560 - spacing*0.5*res.length + (spacing * rID), yy + 50, 72, 72
			);
			DrawTextFitKD(Math.floor(KDGameData.FacilitiesData["Recycler_" + resource] || 0) + "",
				x + 560 + 70 - spacing*0.5*res.length + (spacing * rID), yy + 76, spacing - 80, "#ffffff", KDTextGray0, 32, "left");
			DrawTextFitKD("+" + rates[resource] + ` (${Math.floor(KDGameData.FacilitiesData["RecyclerInput_" + resource] || 0)})`,
				x + 560 + 70 - spacing*0.5*res.length + (spacing * rID), yy + 76 + 32, spacing - 80, rates[resource] > 0 ? "#ffffff" : "#aaaaaa", KDTextGray0, 18, "left");
			rID++;
		}

		if (KDMapData.RoomType == "Summit") {
			DrawButtonKDEx(
				"recycleButton",
				() => {
					KDGameData.InventoryAction = "Recycle";
					KinkyDungeonDrawState = "Inventory";
					KinkyDungeonCurrentFilter = LooseRestraint;
					return true;
				}, KDMapData.RoomType == "Summit",
				x + width/2 + 150, y + 62, 300, 80, TextGet("KDRecycleButton"),
				"#ffffff", KinkyDungeonRootDirectory + 'InventoryAction/Recycle.png',
				undefined, false, true, KDButtonColor, undefined, true
			);
			//yy += 150;
			yy += 180;
			KDDrawRecyclerBlueprints(cats, x, yy, width);


		} else {
			DrawTextFitKD(TextGet("KDFacilityLocal"), x + 560, y + 160, 1050 - 160, "#ffffff", KDTextGray0, 32, "center");
		}

	}
	return dd;
}

let KDSelectedRecyclerCategory = "Null";
let KDSelectedRecyclerItem = "";
let KDRecyclerCatsPerRow = 4;
let KDRecyclerItemsPerRow = 4;
let KDRecyclerCatSpacing = 80;

function KDDrawRecyclerBlueprints(cats: KDBlueprintCategory[], x: number, y: number, width: number) {
	let XX = 0;
	let YY = 0;
	let colCounter = 0;
	let index = 0;
	let selectedcat: KDBlueprintCategory = null;
	if (KDSelectedRecyclerCategory == "Null")
		KDSelectedRecyclerCategory = cats[0].name;
	for (let cat of cats) {
		let selected = cat.name == KDSelectedRecyclerCategory;
		if (selected) selectedcat = cat;
		let hotkey: string = "";
		if (cats[index+1]?.name == KDSelectedRecyclerCategory) {
			hotkey = KinkyDungeonKey[1];
		} else
		if (cats[index-1]?.name == KDSelectedRecyclerCategory) {
			hotkey = KinkyDungeonKey[3];
		}
		DrawButtonKDExScroll(
			"rec_cat_list" + cat.name,
			(amount: number) => {
				if (amount > 0) {
					if (cats[index-1]) {
						KDSelectedRecyclerCategory = cats[index-1].name;
					}
				} else {
					if (cats[index+1]) {
						KDSelectedRecyclerCategory = cats[index+1].name;
					}
				}
			},
			() => {
				if (KDSelectedRecyclerCategory != cat.name) {
					KDSelectedRecyclerCategory = cat.name;
					KDSelectedRecyclerItem = cat.items[0].name;
				} else KDSelectedRecyclerCategory = "";
				return true;
			}, KDMapData.RoomType == "Summit",

			x + XX + 32, y + YY, 72, 72, "",
			"#ffffff", KinkyDungeonRootDirectory + "UI/Recycler/" + cat.name + ".png",
			undefined, false, !selected, KDButtonColor, undefined, true,
			{
				scaleImage: true,
				centered: true,
				hotkey: hotkey ? KDHotkeyToText(hotkey) : undefined,
				hotkeyPress: hotkey,
			}
		);
		colCounter++;
		if (colCounter > KDRecyclerCatsPerRow) {
			colCounter = 0;
			XX = 0;
			YY += KDRecyclerCatSpacing;
		} else {
			XX += KDRecyclerCatSpacing;
		}
		index++;
	}

	YY = 0;
	let secondXX = KDRecyclerCatSpacing * (KDRecyclerCatsPerRow + 0.5);
	let thirdXX = secondXX + KDRecyclerCatSpacing * (KDRecyclerItemsPerRow + 0.5);
	XX = secondXX;
	let selectedItem: KDBlueprint = null;

	if (selectedcat) {
		index = 0;
		let items = Object.values(selectedcat.items);
		for (let item of items) {
			let img = (item.type == Restraint || item.type == LooseRestraint) ?
				KDGetRestraintPreviewImage(KDRestraint({name: item.item}))
				: KinkyDungeonRootDirectory + "Items/" + item.item + ".png";

			let selected = item.name == KDSelectedRecyclerItem;
			if (selected) selectedItem = item;
			let hotkey: string = "";
			if (items[index+1]?.name == KDSelectedRecyclerItem) {
				hotkey = KinkyDungeonKey[6];
			} else
			if (items[index-1]?.name == KDSelectedRecyclerItem) {
				hotkey = KinkyDungeonKey[7];
			}
			DrawButtonKDExScroll(
				"rec_item_list" + item.name,
				(amount: number) => {
					if (amount > 0) {
						if (items[index-1]) {
							KDSelectedRecyclerItem = items[index-1].name;
						}
					} else {
						if (items[index+1]) {
							KDSelectedRecyclerItem = items[index+1].name;
						}
					}
				},
				() => {
					if (KDSelectedRecyclerItem != item.name)
						KDSelectedRecyclerItem = item.name;
					else KDSelectedRecyclerItem = "";
					return true;
				}, KDMapData.RoomType == "Summit",

				x + XX + 32, y + YY, 72, 72, "",
				"#ffffff", img,
				undefined, false, !selected, KDButtonColor, undefined, true,
				{
					scaleImage: true,
					centered: true,
					hotkey: hotkey ? KDHotkeyToText(hotkey) : undefined,
					hotkeyPress: hotkey,
				}
			);
			colCounter++;
			if (colCounter > KDRecyclerCatsPerRow) {
				colCounter = 0;
				XX = 0;
				YY += KDRecyclerCatSpacing;
			} else {
				XX += KDRecyclerCatSpacing;
			}
			index++;
		}

	}
	YY = 0;
	XX = thirdXX;
	if (selectedItem) {
		let img = (selectedItem.type == Restraint || selectedItem.type == LooseRestraint) ?
		KDGetRestraintPreviewImage(KDRestraint({name: selectedItem.item}))
		: KinkyDungeonRootDirectory + "Items/" + selectedItem.item + ".png";
		let hotkey = KinkyDungeonKeyEnter[0];
		DrawButtonKDEx(
			"rec_item_build" + selectedItem.name,
			() => {

				return true;
			}, KDMapData.RoomType == "Summit",

			x + XX + 32, y + YY, 200, 200, "",
			"#ffffff", img,
			undefined, false, false, KDButtonColor, undefined, true,
			{
				scaleImage: true,
				centered: true,
				hotkey: hotkey ? KDHotkeyToText(hotkey) : undefined,
				hotkeyPress: hotkey,
			}
		);

		let resCenter = x + XX + 32 + 100;
		let res = Object.entries(selectedItem.recyclecost);
		for (let i = 0; i < res.length; i++) {
			let xxx = resCenter - res.length / 2 - 36 + 52 * i;
			let resource = res[i][0];
			KDDraw(kdcanvas, kdpixisprites, "fac_item_res_" + resource,
				KinkyDungeonRootDirectory + "UI/Resource/" + resource + ".png",
				xxx, y + YY + 212, 36, 36
			);
			DrawTextFitKD(Math.ceil(res[i][1]) + "",
			xxx + 3, y + YY + 212 + 18, 80, "#ffffff", KDTextGray0, 18, "right");
		}
		DrawTextFitKD(KDGetItemNameString(selectedItem.item),
		x + XX + 32 + 100, y + YY + 272, 200, "#ffffff", KDTextGray0, 24, "center");
		let item = KDItemNoRestraint({name: selectedItem.name});
		let restraint = KDRestraint({name: selectedItem.name});
		if (restraint) {
			let pp = (restraint.displayPower != undefined ? restraint.displayPower : restraint.power);
			pp /= 5; // inflection point between 8 (mythic) and 9 (angelic) should be around 47 power
			DrawTextFitKD(
				TextGet("KinkyDungeonRestraintLevel")
				.replace("RestraintLevel", "" + Math.max(1, restraint.displayPower != undefined ? restraint.displayPower : restraint.power))
				.replace("Rarity", TextGet("KinkyDungeonRarity" + Math.max(0, Math.min(Math.floor(pp),10)))),
			x + XX + 32 + 100, y + YY + 300, 200, "#ffffff", KDTextGray0, 18, "center");
		} else if (item)
			DrawTextFitKD(
				TextGet("KinkyDungeonRestraintLevel")
				.replace("RestraintLevel", "" + Math.max(1, item.rarity))
				.replace("Rarity", TextGet("KinkyDungeonRarity" + Math.max(0, Math.min(Math.floor(item.rarity),10)))),
			x + XX + 32 + 100, y + YY + 300, 200, "#ffffff", KDTextGray0, 18, "center");
	}
}

function KDListRecyclerCats(): KDBlueprintCategory[] {
	let list = [];
	for (let cat of Object.values(KDRecyclerCategories)) {
		if (cat.prereq()) {
			list.push(cat);
		}
	}
	return list;
}