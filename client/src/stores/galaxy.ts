import { constants } from 'ethers'
import { defineStore } from 'pinia'
import GalaxyArtifact from '../../../evm/contract-artifacts/Orbiter8.json'
import { useContract } from './composables/contract'

//todo store data in chain specific storage

export const useGalaxy = defineStore('galaxy', {
  state: () => {
    return {
      contract: useContract('Galaxy', GalaxyArtifact.abi),
      isLoaded: false,
      isLoading: false,
      chainstate: {
        creditBalance: 0,
        systemCount: 0,
        shipLocation: 0,
        shipId: 0,
        ship: {} as Ship,
        systemData: {} as System,
        ships: [] as any[],
        planets: [] as any[],
        localPlanets: [] as Planet[],
        systemPlanets: [] as any[]
      }
    }
  },
  getters: {
    galaxyContractAddress():string {
      return this.contract.address
    },
    isConnected():boolean {
      return this.contract.isConnected
    }
  },
  actions: {
    async connect() {
      await this.contract.connect()
    },

    //views

    async getAll() {
      if (this.isLoading) {
        return
      }
      this.isLoading = true
      await Promise.all([
        this.getSystemCount(),
        this.getPlayerSystemData(),
        this.myBalance(),
        this.getMyShipLocation(),
        this.getMyShipId(),
        this.getMyShip()
      ])
      this.isLoaded = true
      this.isLoading = false
    },
    async getPlayerSystemData() {
      [
        this.chainstate.systemData.id,
        this.chainstate.systemData.name,
        this.chainstate.systemData.starSize,
        this.chainstate.systemData.birthtime,
        this.chainstate.systemData.discoveredBy,
        this.chainstate.systemData.neighbors,
        this.chainstate.systemData.planets,
        this.chainstate.systemData.logs
       ] = await this.contract.read(
        'getPlayerSystemData'
      )
      await this.getPlayerSystemPlanets()
    },
    async getPlayerSystemPlanets() {
      let planetData:any[] = await Promise.all(
        this.chainstate.systemData.planets.map(
          async (planetId:any, pindex) => {
            planetId = BigInt(planetId)
            let planet = null
            if (planetId > BigInt(0)) {

              planet = this.mapPlanetObject(
                await this.contract.read(
                  'getPlanet',
                  [planetId]
                ),
                pindex
              )

              let moons:any[] = await Promise.all(
                planet.hasMoons.map(
                  async (hasMoon:any, mindex) => {
                    if (hasMoon) {
                      let moon = null
                      moon = this.mapMoonObject(
                        await this.contract.read(
                          'getMoon',
                          [planetId, mindex]
                        ),
                        mindex
                      )
                      return moon
                    } else {
                      return null
                    }
                  }
                )
              )

              planet.moons = moons.filter(moon => moon != null)

              if (planet.hasPort) {
                planet.station = this.mapStationObject(
                  await this.contract.read(
                    'getStation',
                    [planetId]
                  )
                )
              }
            }
            return planet
          }
        )
      )
      this.chainstate.localPlanets = planetData.filter(planet => planet != null)
    },
    mapPlanetObject(data:any[], orbit:number):Planet {
      let planet:Planet = {
        orbit: orbit,
        name: data[0],
        systemId: data[1],
        attributes: {
          size: data[2][0],
          class: data[2][1],
          rings: data[2][2],
          speed: data[2][3]
        },
        owner: data[3],
        hasMoons: data[4],
        hasPort: data[5],
        moons: []
      }
      return planet
    },
    mapMoonObject(data:any[], orbit:number):Moon {
      let moon:Moon = {
        orbit: orbit,
        name: data[0],
        size: data[1],
        class: data[2],
        velocity: data[3]
      }
      return moon
    },
    mapStationObject(data:any[]):Station {
      let station:Station = {
        name: data[0],
        size: data[1],
        inventory: {
          equipment: data[2][0],
          fuel: data[2][1],
          organics: data[2][2]
        },
        price: {
          equipment: data[3][0],
          fuel: data[3][1],
          organics: data[3][2],
          holds:data[3][3]
        }
      }
      return station
    },
    async myBalance() {
      this.chainstate.creditBalance = await this.contract.read(
        'myBalance'
      )
    },
    async getShip(shipId:number) {
      this.chainstate.ships[shipId] = await this.contract.read(
        'getShip',
        [shipId]
      )
    },
    async getPlanet(planetId:number) {
      this.chainstate.planets[planetId] = await this.contract.read(
        'getPlanet',
        [planetId]
      )
    },
    async getLocalPlanet(orbitalId:number) {
      this.chainstate.localPlanets[orbitalId] = await this.contract.read(
        'getLocalPlanet',
        [orbitalId]
      )
    },
    async getMoon(planetId:Number, moonId:Number) {
      let tempMoon = await this.contract.read(
        'getMoon',
        [planetId, moonId]
      )
    },
    async getStation(planetId:number) {
      let tempStation = await this.contract.read(
        'getStation',
        [planetId]
      )
    },
    async getSystemCount() {
      this.chainstate.systemCount = await this.contract.read(
        'getSystemCount'
      )
    },
    async getMyShipLocation() {
      this.chainstate.shipLocation = await this.contract.read(
        'getMyShipLocation'
      )
    },
    async getMyShipId() {
      this.chainstate.shipId = await this.contract.read(
        'getMyShipId'
      )
    },
    async getMyShip() {
      [
        this.chainstate.ship.name,
        this.chainstate.ship.systemId,
        this.chainstate.ship.orbit,
        this.chainstate.ship.cargoLimit,
        this.chainstate.ship.equipment,
        this.chainstate.ship.fuel,
        this.chainstate.ship.organics,
      ] = await this.contract.read(
        'getMyShip'
      )
    },
    async getSystemName(systemId:number) {
      let name = await this.contract.read(
        'getSystemName',
        [systemId]
      )
      return name
    },

    //controls
    async sendChat(message:string) {
      this.contract.call('sendChat', [message])
    },
    async renameStar(name:string) {
      this.contract.call('renameStar', [name])
    },
    async renameMyShip(name:string) {
      this.contract.call('renameMyShip', [name])
    },
    async renamePlanet(id:number, name:string) {
      this.contract.call('renamePlanet', [id, name])
    },
    async claimPlanet(planetId:number, planetName:string) {
      this.contract.call('claimPlanet', [planetId, planetName])
    },
    async buildStation(planetId:number, stationName:string) {
      this.contract.call('buildStation', [planetId, stationName])
    },
    async renameMoon(planetId:number, moonId:number, name:string) {
      this.contract.call('renameMoon', [planetId, moonId, name])
    },
    async renameStation(id:number, name:string) {
      this.contract.call('renameStation', [id, name])
    },
    async addPortToStation(id:number) {
      this.contract.call('addPortToStation', [id])
    },
    async tradeAtPort(planetId:number,equipment:number,fuel:number,organics:number) {
      this.contract.call('tradeAtPort', [planetId, equipment, fuel, organics])
    },
    async addHoldsToShip(planetId:number,holds:number) {
      this.contract.call('addHoldsToShip', [planetId, holds])
    },
    async moveToSystem(destinationSystemId:number) {
      this.contract.call('moveToSystem', [destinationSystemId])
    },
    async launchShip(name:string) {
      this.contract.call('launchShip', [name])
    },

  }
})


interface System {
  id: string,
  name: string,
  starSize: number,
  birthtime: string,
  discoveredBy: string,
  neighbors: string[],
  planets: string[],
  logs: string[]
}

interface Ship {
  name: string,
  systemId: number,
  orbit: number,
  cargoLimit: number,
  equipment: number,
  fuel: number,
  organics: number
}

interface Moon {
  orbit: number,
  name: string,
  size: number,
  class: number,
  velocity: number
}

interface Station {
  name: string,
  size: number,
  inventory: {
    equipment: number,
    fuel: number,
    organics: number
  },
  price: {
    equipment: number,
    fuel: number,
    organics: number,
    holds:number
  }
}

interface Planet {
  orbit: number,
  name: string,
  systemId: BigInt,
  attributes: {
    size: number,
    class: number,
    rings: number,
    speed: number
  },
  owner: BigInt,
  hasMoons: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number
  ]
  moons: Moon[],
  hasPort: boolean,
  station: Station
}
